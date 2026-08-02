import { Request, Response } from 'express';
import { sslService } from '../services/sslService';
import { domainService } from '../services/domainService';
import { prisma, isDbOffline } from '../repositories/prisma';
import { inMemoryDb } from '../repositories/inMemoryDb';

export const sslController = {
  /**
   * List all domains for a site
   */
  async getSiteDomains(req: Request, res: Response) {
    try {
      const { siteId } = req.params;

      if (isDbOffline) {
        const site = inMemoryDb.sites.find((s) => s.id === siteId);
        if (!site) {
          res.status(404).json({ success: false, error: { message: 'Site not found', code: 'NOT_FOUND' } });
          return;
        }

        const siteDomains = inMemoryDb.domains.filter((d) => d.siteId === siteId || d.domain === site.domain);
        res.status(200).json({ success: true, data: siteDomains });
        return;
      }

      const site = await prisma.site.findUnique({ where: { id: siteId } });
      if (!site) {
        res.status(404).json({ success: false, error: { message: 'Site not found', code: 'NOT_FOUND' } });
        return;
      }

      const siteDomains = await prisma.domain.findMany({
        where: { OR: [{ siteId }, { domain: site.domain }] },
        include: { certificates: true },
      });

      res.status(200).json({ success: true, data: siteDomains });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { message: err.message, code: 'INTERNAL_ERROR' } });
    }
  },

  /**
   * Add a new custom domain to a site
   */
  async addSiteDomain(req: Request, res: Response) {
    try {
      const { siteId } = req.params;
      const { domain } = req.body;
      const userId = (req as any).user?.userId;

      if (!domain) {
        res.status(400).json({ success: false, error: { message: 'Domain name is required', code: 'BAD_REQUEST' } });
        return;
      }

      const parts = domain.split('.');
      if (parts.length < 2) {
        res.status(400).json({ success: false, error: { message: 'Invalid domain format', code: 'BAD_REQUEST' } });
        return;
      }

      const ext = parts.pop()!;
      const name = parts.join('.');

      const newDomain = await domainService.createDomain(userId || 'system', name, ext);
      
      // Associate with siteId
      if (isDbOffline) {
        const dObj = inMemoryDb.domains.find((d) => d.id === newDomain.id);
        if (dObj) dObj.siteId = siteId;
      } else {
        await prisma.domain.update({ where: { id: newDomain.id }, data: { siteId } });
      }

      // Automatically trigger initial DNS check & Certificate provisioning
      const certMetadata = await sslService.provisionCertificate(domain, siteId, newDomain.id);

      res.status(201).json({
        success: true,
        data: { domain: newDomain, certificate: certMetadata },
      });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { message: err.message, code: 'BAD_REQUEST' } });
    }
  },

  /**
   * Verify DNS setup for a domain
   */
  async verifyDomainDns(req: Request, res: Response) {
    try {
      const { domainId } = req.params;
      let hostname = '';

      if (isDbOffline) {
        const d = inMemoryDb.domains.find((dom) => dom.id === domainId || dom.domain === domainId);
        hostname = d ? d.domain : domainId;
      } else {
        const d = await prisma.domain.findFirst({ where: { OR: [{ id: domainId }, { domain: domainId }] } });
        hostname = d ? d.domain : domainId;
      }

      const dnsResult = await sslService.verifyDns(hostname);
      res.status(200).json({
        success: true,
        data: {
          hostname,
          dnsValid: dnsResult.valid,
          ip: dnsResult.ip || null,
          reason: dnsResult.reason || null,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { message: err.message, code: 'INTERNAL_ERROR' } });
    }
  },

  /**
   * Provision / Request SSL Certificate for domain
   */
  async requestDomainCertificate(req: Request, res: Response) {
    try {
      const { siteId, domainId } = req.params;
      const { sanList } = req.body || {};

      let hostname = domainId;
      if (isDbOffline) {
        const d = inMemoryDb.domains.find((dom) => dom.id === domainId || dom.domain === domainId);
        if (d) hostname = d.domain;
      } else {
        const d = await prisma.domain.findFirst({ where: { OR: [{ id: domainId }, { domain: domainId }] } });
        if (d) hostname = d.domain;
      }

      const certMetadata = await sslService.provisionCertificate(hostname, siteId, domainId, sanList);
      res.status(200).json({ success: true, data: certMetadata });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { message: err.message, code: 'INTERNAL_ERROR' } });
    }
  },

  /**
   * Get Certificate Status for domain
   */
  async getDomainCertificateStatus(req: Request, res: Response) {
    try {
      const { domainId } = req.params;
      let hostname = domainId;

      if (isDbOffline) {
        const d = inMemoryDb.domains.find((dom) => dom.id === domainId || dom.domain === domainId);
        if (d) hostname = d.domain;
      } else {
        const d = await prisma.domain.findFirst({ where: { OR: [{ id: domainId }, { domain: domainId }] } });
        if (d) hostname = d.domain;
      }

      let cert = await sslService.getCertificateStatus(hostname);

      // Auto-provision if no cert record exists yet
      if (!cert) {
        cert = await sslService.provisionCertificate(hostname);
      }

      res.status(200).json({ success: true, data: cert });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { message: err.message, code: 'INTERNAL_ERROR' } });
    }
  },

  /**
   * Manually renew SSL Certificate for domain
   */
  async renewDomainCertificate(req: Request, res: Response) {
    try {
      const { siteId, domainId } = req.params;
      let hostname = domainId;

      if (isDbOffline) {
        const d = inMemoryDb.domains.find((dom) => dom.id === domainId || dom.domain === domainId);
        if (d) hostname = d.domain;
      } else {
        const d = await prisma.domain.findFirst({ where: { OR: [{ id: domainId }, { domain: domainId }] } });
        if (d) hostname = d.domain;
      }

      const certMetadata = await sslService.provisionCertificate(hostname, siteId, domainId);
      res.status(200).json({ success: true, data: certMetadata });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { message: err.message, code: 'INTERNAL_ERROR' } });
    }
  },

  /**
   * List all Certificates across the platform
   */
  async listAllCertificates(_req: Request, res: Response) {
    try {
      const certificates = await sslService.listAllCertificates();
      res.status(200).json({ success: true, data: certificates });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { message: err.message, code: 'INTERNAL_ERROR' } });
    }
  },
};
