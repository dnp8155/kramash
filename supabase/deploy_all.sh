#!/bin/bash
# ============================================================
# Deploy ALL Edge Functions to Supabase
# ============================================================
# Prerequisites:
#   1. Install Supabase CLI:  npm install -g supabase
#   2. Login:                  supabase login
#   3. Link project:            supabase link --project-ref <YOUR_PROJECT_REF>
#
# Then run this script:
#   chmod +x supabase/deploy_all.sh
#   ./supabase/deploy_all.sh
# ============================================================

set -e

FUNCTIONS=(
  adminDashboardStats
  adminGetWorkspaceDetails
  adminListWorkspaces
  adminSetWorkspaceStatus
  agentChat
  assignProSubscription
  clientViewQuotation
  createEvent
  createInvoiceFromQuotation
  createLead
  createPaymentOrder
  createService
  createTeamAssignment
  createTeamMember
  deleteTransaction
  dispatchPushNotification
  downgradeToFree
  editTransaction
  enableClientPortalAccess
  enableTeamPortalAccess
  generateNotifications
  generateWebAuthnAssertionChallenge
  generateWebAuthnRegistrationChallenge
  getClientPortalData
  getClientPortalDataByAccess
  getPortalData
  getPublicEventData
  getPublicInvoice
  getPublicJobSheet
  getPublicProfile
  getPushConfig
  getTeamPortalData
  getTeamPortalDataByAccess
  handleRazorpayWebhook
  handleStripeWebhook
  initWorkspaceSubscription
  recordInvoicePayment
  recordPayment
  registerPushSubscription
  sendOtp
  signQuotation
  submitUpgradeRequest
  syncQuotationAcceptance
  toggleInvoicePublicLink
  togglePublicLink
  trackStorageUsage
  updateClientPortalPassword
  updateTeamPortalPassword
  verifyClientPortalAccess
  verifyFirebaseToken
  verifyOtp
  verifyPayment
  verifyTeamPortalAccess
  verifyWebAuthnAssertion
  verifyWebAuthnRegistration
  voidTransaction
)

echo "=========================================="
echo "  Deploying ${#FUNCTIONS[@]} Edge Functions to Supabase"
echo "=========================================="

SUCCESS=0
FAILED=0

for func in "${FUNCTIONS[@]}"; do
  echo -n "  Deploying $func... "
  if supabase functions deploy "$func" --no-verify-jwt 2>&1 | grep -q "Deployed Function"; then
    echo "✅"
    ((SUCCESS++))
  else
    echo "❌ (check output above)"
    ((FAILED++))
  fi
done

echo ""
echo "=========================================="
echo "  Done: $SUCCESS succeeded, $FAILED failed"
echo "=========================================="