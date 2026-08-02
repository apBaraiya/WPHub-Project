import { Router } from 'express';
import { sslController } from '../controllers/sslController';
import { authenticate } from '../middleware/authMiddleware';

const router: Router = Router();

// Platform wide certificate status list
router.get('/certificates', authenticate, sslController.listAllCertificates);

// Site domain management endpoints
router.get('/sites/:siteId/domains', authenticate, sslController.getSiteDomains);
router.post('/sites/:siteId/domains', authenticate, sslController.addSiteDomain);

// Domain specific SSL & DNS verification endpoints
router.post('/sites/:siteId/domains/:domainId/verify', authenticate, sslController.verifyDomainDns);
router.post('/sites/:siteId/domains/:domainId/certificate', authenticate, sslController.requestDomainCertificate);
router.get('/sites/:siteId/domains/:domainId/certificate', authenticate, sslController.getDomainCertificateStatus);
router.post('/sites/:siteId/domains/:domainId/renew', authenticate, sslController.renewDomainCertificate);

export default router;
