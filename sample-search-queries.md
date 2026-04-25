# Sample Search Queries & Expected Outputs

## Search API

```
GET /api/v1/search?q={your question}&limit=5
```

**Parameters:**
| Param | Type | Required | Description |
|---|---|---|---|
| `q` | string | Yes | Search query (1–500 chars) |
| `limit` | integer | No | Max results returned (1–50, default 10) |

**Response shape:**
```json
{
  "query": "string",
  "total": 3,
  "limit": 10,
  "results": [
    {
      "article_id": "art_claims_travel_001",
      "slug": "travel-insurance-claims",
      "title": "Travel Insurance Claims",
      "snippet": "...matched text excerpt (~200 chars)...",
      "matched_section": "Section heading where match was found",
      "category": { "id": "cat_claims", "name": "Claims" },
      "subcategory": { "id": "sub_travel", "name": "Travel" },
      "score": 0.84,
      "read_time_min": 3
    }
  ]
}
```

> **Note:** Results are ranked by hybrid score = vector cosine similarity + 0.15 × keyword title overlap.

---

## 15 Sample Questions & Expected Outputs

---

### 1. How do I file a travel insurance claim?

```
GET /api/v1/search?q=How do I file a travel insurance claim?&limit=3
```

**Expected response:**
```json
{
  "query": "How do I file a travel insurance claim?",
  "total": 3,
  "limit": 3,
  "results": [
    {
      "article_id": "art_claims_travel_001",
      "slug": "travel-insurance-claims",
      "title": "Travel Insurance Claims",
      "snippet": "To file a travel insurance claim, log in to the Great Eastern portal and navigate to Claims. Submit the online claim form with supporting documents such as your travel itinerary...",
      "matched_section": "How to Submit a Travel Claim",
      "category": { "id": "cat_claims", "name": "Claims" },
      "subcategory": { "id": "sub_travel", "name": "Travel" },
      "score": 0.87,
      "read_time_min": 4
    },
    {
      "article_id": "art_claims_travel_002",
      "slug": "travel-claim-documents",
      "title": "Documents Required for Travel Claims",
      "snippet": "Required documents include: original receipts, medical certificates, police report (for theft), airline delay confirmation...",
      "matched_section": "Document Checklist",
      "category": { "id": "cat_claims", "name": "Claims" },
      "subcategory": { "id": "sub_travel", "name": "Travel" },
      "score": 0.79,
      "read_time_min": 3
    }
  ]
}
```

---

### 2. What documents do I need for a hospital claim?

```
GET /api/v1/search?q=What documents do I need for a hospital claim?&limit=3
```

**Expected response:**
```json
{
  "query": "What documents do I need for a hospital claim?",
  "total": 3,
  "limit": 3,
  "results": [
    {
      "article_id": "art_claims_medical_001",
      "slug": "hospitalisation-claims",
      "title": "Hospitalisation & Surgical Claims",
      "snippet": "Submit original hospital bills, discharge summary, attending physician's statement, and identity documents. Claims must be submitted within 30 days of discharge...",
      "matched_section": "Required Documents",
      "category": { "id": "cat_claims", "name": "Claims" },
      "subcategory": { "id": "sub_medical", "name": "Medical" },
      "score": 0.91,
      "read_time_min": 4
    }
  ]
}
```

---

### 3. How do I set up GIRO for premium payment?

```
GET /api/v1/search?q=How do I set up GIRO for premium payment?&limit=3
```

**Expected response:**
```json
{
  "query": "How do I set up GIRO for premium payment?",
  "total": 3,
  "limit": 3,
  "results": [
    {
      "article_id": "art_payment_giro_001",
      "slug": "giro-payment-setup",
      "title": "Setting Up GIRO for Premium Payment",
      "snippet": "To set up GIRO, complete the GIRO application form and submit it to your bank. Processing takes 4–6 weeks. You may continue paying by other methods in the interim...",
      "matched_section": "GIRO Application Steps",
      "category": { "id": "cat_payment", "name": "Payment" },
      "subcategory": { "id": "sub_giro", "name": "GIRO" },
      "score": 0.88,
      "read_time_min": 3
    }
  ]
}
```

---

### 4. How do I change my policy beneficiary?

```
GET /api/v1/search?q=How do I change my policy beneficiary?&limit=3
```

**Expected response:**
```json
{
  "query": "How do I change my policy beneficiary?",
  "total": 3,
  "limit": 3,
  "results": [
    {
      "article_id": "art_policy_beneficiary_001",
      "slug": "change-policy-beneficiary",
      "title": "Changing Your Policy Beneficiary",
      "snippet": "To change your beneficiary, complete the Nomination of Beneficiary form. The change takes effect upon receipt of the completed form by Great Eastern...",
      "matched_section": "How to Nominate or Change a Beneficiary",
      "category": { "id": "cat_policy", "name": "Policy Management" },
      "subcategory": { "id": "sub_updates", "name": "Policy Updates" },
      "score": 0.85,
      "read_time_min": 3
    }
  ]
}
```

---

### 5. What is CareShield Life and how do I enrol?

```
GET /api/v1/search?q=What is CareShield Life and how do I enrol?&limit=3
```

**Expected response:**
```json
{
  "query": "What is CareShield Life and how do I enrol?",
  "total": 3,
  "limit": 3,
  "results": [
    {
      "article_id": "art_careshield_enrol_001",
      "slug": "careshield-life-enrolment",
      "title": "CareShield Life Enrolment Guide",
      "snippet": "CareShield Life is a long-term care insurance scheme that provides monthly payouts if you become severely disabled. Singapore residents born 1980 or later are auto-enrolled...",
      "matched_section": "What is CareShield Life?",
      "category": { "id": "cat_careshield", "name": "CareShield Life" },
      "subcategory": { "id": "sub_enrolment", "name": "Enrolment" },
      "score": 0.92,
      "read_time_min": 5
    }
  ]
}
```

---

### 6. How do I make a car accident insurance claim?

```
GET /api/v1/search?q=How do I make a car accident insurance claim?&limit=3
```

**Expected response:**
```json
{
  "query": "How do I make a car accident insurance claim?",
  "total": 3,
  "limit": 3,
  "results": [
    {
      "article_id": "art_claims_motor_001",
      "slug": "motor-accident-claims",
      "title": "Motor Accident Claims",
      "snippet": "After a motor accident, report to Great Eastern within 24 hours regardless of fault. Bring your vehicle to an authorised workshop for assessment. Do not repair before inspection...",
      "matched_section": "Immediate Steps After an Accident",
      "category": { "id": "cat_claims", "name": "Claims" },
      "subcategory": { "id": "sub_motor", "name": "Motor" },
      "score": 0.86,
      "read_time_min": 4
    }
  ]
}
```

---

### 7. How do I update my contact information?

```
GET /api/v1/search?q=How do I update my contact information?&limit=3
```

**Expected response:**
```json
{
  "query": "How do I update my contact information?",
  "total": 3,
  "limit": 3,
  "results": [
    {
      "article_id": "art_policy_contact_001",
      "slug": "update-contact-details",
      "title": "Updating Your Contact Details",
      "snippet": "Log in to the Great Eastern Online portal, go to My Profile, and update your email address, phone number or mailing address. Changes take effect immediately...",
      "matched_section": "Updating via Online Portal",
      "category": { "id": "cat_policy", "name": "Policy Management" },
      "subcategory": { "id": "sub_updates", "name": "Policy Updates" },
      "score": 0.83,
      "read_time_min": 2
    }
  ]
}
```

---

### 8. What is the DPS scheme and am I eligible?

```
GET /api/v1/search?q=What is the DPS scheme and am I eligible?&limit=3
```

**Expected response:**
```json
{
  "query": "What is the DPS scheme and am I eligible?",
  "total": 3,
  "limit": 3,
  "results": [
    {
      "article_id": "art_dps_overview_001",
      "slug": "dependants-protection-scheme",
      "title": "Dependants' Protection Scheme (DPS) Overview",
      "snippet": "DPS is a term life insurance scheme providing a lump sum payout to your dependants upon death or total permanent disability. All CPF members aged 21–65 are auto-covered...",
      "matched_section": "Eligibility and Coverage",
      "category": { "id": "cat_dps", "name": "DPS" },
      "subcategory": { "id": "sub_overview", "name": "Overview" },
      "score": 0.89,
      "read_time_min": 4
    }
  ]
}
```

---

### 9. How long does a claims payout take?

```
GET /api/v1/search?q=How long does a claims payout take?&limit=3
```

**Expected response:**
```json
{
  "query": "How long does a claims payout take?",
  "total": 3,
  "limit": 3,
  "results": [
    {
      "article_id": "art_claims_process_001",
      "slug": "claims-processing-timeline",
      "title": "Claims Processing Timeline",
      "snippet": "Standard claims are processed within 7–14 business days upon receipt of complete documents. Complex or disputed claims may take longer. You will be notified via email at each stage...",
      "matched_section": "Processing Times",
      "category": { "id": "cat_claims", "name": "Claims" },
      "subcategory": { "id": "sub_process", "name": "Claims Process" },
      "score": 0.81,
      "read_time_min": 3
    }
  ]
}
```

---

### 10. How do I cancel my insurance policy?

```
GET /api/v1/search?q=How do I cancel my insurance policy?&limit=3
```

**Expected response:**
```json
{
  "query": "How do I cancel my insurance policy?",
  "total": 3,
  "limit": 3,
  "results": [
    {
      "article_id": "art_policy_cancel_001",
      "slug": "policy-cancellation",
      "title": "Cancelling Your Policy",
      "snippet": "To cancel your policy, submit a written request or complete the Policy Cancellation form. For policies within the free-look period (14 days), a full refund of premiums will be issued...",
      "matched_section": "Cancellation Process",
      "category": { "id": "cat_policy", "name": "Policy Management" },
      "subcategory": { "id": "sub_cancellation", "name": "Cancellation" },
      "score": 0.88,
      "read_time_min": 3
    }
  ]
}
```

---

### 11. Can I pay my premium using PayNow?

```
GET /api/v1/search?q=Can I pay my premium using PayNow?&limit=3
```

**Expected response:**
```json
{
  "query": "Can I pay my premium using PayNow?",
  "total": 3,
  "limit": 3,
  "results": [
    {
      "article_id": "art_payment_methods_001",
      "slug": "premium-payment-methods",
      "title": "Premium Payment Methods",
      "snippet": "Great Eastern accepts payment via GIRO, PayNow, credit card, and cheque. To pay via PayNow, use UEN number 197301463C. Include your policy number in the reference field...",
      "matched_section": "PayNow Payment",
      "category": { "id": "cat_payment", "name": "Payment" },
      "subcategory": { "id": "sub_methods", "name": "Payment Methods" },
      "score": 0.84,
      "read_time_min": 2
    }
  ]
}
```

---

### 12. How do I get a copy of my policy document?

```
GET /api/v1/search?q=How do I get a copy of my policy document?&limit=3
```

**Expected response:**
```json
{
  "query": "How do I get a copy of my policy document?",
  "total": 3,
  "limit": 3,
  "results": [
    {
      "article_id": "art_digital_docs_001",
      "slug": "policy-document-retrieval",
      "title": "Retrieving Your Policy Documents",
      "snippet": "Policy documents are available in the Great Eastern Online portal under My Policies > Documents. You can download a PDF copy at any time. Physical copies can be requested via customer service...",
      "matched_section": "Accessing Policy Documents Online",
      "category": { "id": "cat_digital", "name": "Digital Services" },
      "subcategory": { "id": "sub_documents", "name": "Documents" },
      "score": 0.82,
      "read_time_min": 2
    }
  ]
}
```

---

### 13. What happens if I miss a premium payment?

```
GET /api/v1/search?q=What happens if I miss a premium payment?&limit=3
```

**Expected response:**
```json
{
  "query": "What happens if I miss a premium payment?",
  "total": 3,
  "limit": 3,
  "results": [
    {
      "article_id": "art_payment_lapse_001",
      "slug": "missed-premium-payment",
      "title": "Missed Premium Payments & Policy Lapse",
      "snippet": "A grace period of 30 days is given for missed payments. If payment is not received within the grace period, your policy may lapse. A lapsed policy can be reinstated within 2 years...",
      "matched_section": "Grace Period and Lapse",
      "category": { "id": "cat_payment", "name": "Payment" },
      "subcategory": { "id": "sub_lapse", "name": "Policy Lapse" },
      "score": 0.86,
      "read_time_min": 3
    }
  ]
}
```

---

### 14. How do I submit a death claim for a family member?

```
GET /api/v1/search?q=How do I submit a death claim for a family member?&limit=3
```

**Expected response:**
```json
{
  "query": "How do I submit a death claim for a family member?",
  "total": 3,
  "limit": 3,
  "results": [
    {
      "article_id": "art_claims_death_001",
      "slug": "death-claim-guide",
      "title": "Death Claim Submission Guide",
      "snippet": "To submit a death claim, the claimant must provide the original death certificate, proof of relationship, deceased's identity document, and completed claim form. Contact 1800 248 2888 for assistance...",
      "matched_section": "Required Documents for Death Claims",
      "category": { "id": "cat_claims", "name": "Claims" },
      "subcategory": { "id": "sub_life", "name": "Life Claims" },
      "score": 0.90,
      "read_time_min": 5
    }
  ]
}
```

---

### 15. How do I reset my Great Eastern online account password?

```
GET /api/v1/search?q=How do I reset my Great Eastern online account password?&limit=3
```

**Expected response:**
```json
{
  "query": "How do I reset my Great Eastern online account password?",
  "total": 3,
  "limit": 3,
  "results": [
    {
      "article_id": "art_digital_login_001",
      "slug": "reset-online-account-password",
      "title": "Resetting Your Online Account Password",
      "snippet": "Click Forgot Password on the login page and enter your registered email. A reset link will be sent within 5 minutes. The link expires after 30 minutes for security...",
      "matched_section": "Password Reset Steps",
      "category": { "id": "cat_digital", "name": "Digital Services" },
      "subcategory": { "id": "sub_account", "name": "Account Management" },
      "score": 0.83,
      "read_time_min": 2
    }
  ]
}
```

---

## Error Cases

### Empty query → 400
```
GET /api/v1/search?q=
```
```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Query parameter 'q' must not be empty" } }
```

### Query too long → 400
```
GET /api/v1/search?q=<501+ characters>
```
```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Query parameter 'q' must be 500 characters or fewer" } }
```

### No matching results → 200 with empty array
```json
{ "query": "xyzzy nonsense query", "total": 0, "limit": 10, "results": [] }
```

---

## Quick curl Reference

```bash
# Basic search
curl "http://localhost:8000/api/v1/search?q=travel+claim"

# With limit
curl "http://localhost:8000/api/v1/search?q=GIRO+payment+setup&limit=5"

# URL-encoded query
curl --get "http://localhost:8000/api/v1/search" \
  --data-urlencode "q=How do I cancel my policy?" \
  --data-urlencode "limit=3"
```
