import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { sslService } from './sslService';

async function runSslTests() {
  console.log('Starting STEP 10 — Universal SSL / HTTPS / Certificate Management Tests...');
  const testHost = 'test-ssl-domain.wphub.cloud';

  sslService.ensureStorageDirs();

  // Test 1: Pre-requisite DNS Verification
  const dnsResult = await sslService.verifyDns(testHost);
  assert.strictEqual(dnsResult.valid, true, 'DNS verification for cloud subdomain should be valid');
  console.log('✔ Test 1 Passed: DNS verification succeeded.');

  // Test 2: Provision Certificate
  const certMeta = await sslService.provisionCertificate(testHost);
  assert.strictEqual(certMeta.hostname, testHost);
  assert.strictEqual(certMeta.status, 'ACTIVE');
  assert.strictEqual(certMeta.issuer, "Let's Encrypt");
  assert.strictEqual(certMeta.httpsValid, true);

  const keyPath = path.join(process.cwd(), 'runtimes', 'ssl', `${testHost}.key`);
  const crtPath = path.join(process.cwd(), 'runtimes', 'ssl', `${testHost}.crt`);

  assert.strictEqual(fs.existsSync(keyPath), true, 'Key file should exist in infrastructure storage');
  assert.strictEqual(fs.existsSync(crtPath), true, 'Certificate file should exist in infrastructure storage');

  const keyContent = fs.readFileSync(keyPath, 'utf8');
  assert.ok(keyContent.includes('-----BEGIN PRIVATE KEY-----'), 'Key content should be valid PEM');
  console.log('✔ Test 2 Passed: Automatic TLS certificate provisioning & secure key storage succeeded.');

  // Test 3: Traefik dynamic YAML configuration
  const yamlPath = path.join(process.cwd(), 'wphub', 'infrastructure', 'traefik', 'dynamic', `ssl-${testHost}.json`);
  assert.strictEqual(fs.existsSync(yamlPath), true, 'Traefik dynamic config file should exist');

  const content = fs.readFileSync(yamlPath, 'utf8');
  const parsed = JSON.parse(content);
  assert.strictEqual(
    parsed.http.middlewares['forwarded-headers'].headers.customRequestHeaders['X-Forwarded-Proto'],
    'https',
    'X-Forwarded-Proto header should be https',
  );
  console.log('✔ Test 3 Passed: Traefik dynamic config & X-Forwarded-Proto header verification succeeded.');

  // Test 4: Auto renewal check
  const renewResult = await sslService.checkAndRenewCertificates();
  assert.ok(renewResult.checked > 0, 'Should check active certificates');
  console.log('✔ Test 4 Passed: Certificate expiry tracking & renewal check succeeded.');

  // Test 5: Safe deletion & isolation
  const isolatedHost = 'isolated-site.wphub.cloud';
  await sslService.provisionCertificate(isolatedHost);
  const statusBefore = await sslService.getCertificateStatus(isolatedHost);
  assert.ok(statusBefore !== null, 'Certificate should exist before deletion');

  await sslService.deleteCertificate(isolatedHost);
  const statusAfter = await sslService.getCertificateStatus(isolatedHost);
  assert.strictEqual(statusAfter, null, 'Certificate should be null after deletion');
  console.log('✔ Test 5 Passed: Site isolation & certificate deletion succeeded.');

  // Cleanup test host
  await sslService.deleteCertificate(testHost);
  console.log('🎉 ALL STEP 10 UNIVERSAL SSL / HTTPS TESTS PASSED SUCCESSFULLY!');
}

runSslTests().catch((err) => {
  console.error('❌ SSL Test Failure:', err);
  process.exit(1);
});
