#!/bin/bash

# Update Terms of Service
cat << 'INNER_EOF' >> frontend/content/docs/legal/terms-of-service.mdx

# 49. Jurisdiction-Specific Provisions

The following provisions apply to Customers and End-Users depending on their geographic location:

### 49.1 European Union (EU) and United Kingdom (UK)
* **Consumer Rights Directive:** If an End-User is a consumer residing in the EU or UK, they may have statutory withdrawal rights. However, by booking a time-specific service or digital queue slot, the End-User acknowledges that the right of withdrawal may be forfeited once the service is fully performed. It is the Tenant's responsibility to manage EU/UK consumer withdrawal rights.
* **GDPR Compliance:** Qmova operates strictly in accordance with the General Data Protection Regulation (GDPR). Tenants transferring data outside the EEA rely on standard contractual clauses where applicable.

### 49.2 United States (California)
* **CCPA/CPRA:** Qmova acts as a "Service Provider" under the California Consumer Privacy Act. Qmova does not "sell" or "share" personal information.
INNER_EOF

echo "Done TOS"
