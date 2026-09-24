#!/bin/bash
# ============================================================
# Setup Supabase Edge Function Secrets
# ============================================================
# Run this AFTER `supabase link --project-ref YOUR_PROJECT_REF`
#
# Usage:
#   chmod +x supabase/setup_secrets.sh
#   ./supabase/setup_secrets.sh
# ============================================================

set -e

echo "=========================================="
echo "  Setting Supabase Edge Function Secrets"
echo "=========================================="

# --- REQUIRED: Supabase (auto-set by platform, but verify) ---
echo ""
echo "--- Supabase Core ---"
read -p "Enter SUPABASE_URL (or press Enter to skip): " SUPABASE_URL
if [ -n "$SUPABASE_URL" ]; then
  supabase secrets set SUPABASE_URL="$SUPABASE_URL"
fi

read -p "Enter SUPABASE_SERVICE_ROLE_KEY (or press Enter to skip): " SUPABASE_SERVICE_ROLE_KEY
if [ -n "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  supabase secrets set SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY"
fi

# --- REQUIRED: Razorpay ---
echo ""
echo "--- Razorpay (Required for payments) ---"
read -p "Enter RAZORPAY_KEY_ID: " RAZORPAY_KEY_ID
if [ -n "$RAZORPAY_KEY_ID" ]; then
  supabase secrets set RAZORPAY_KEY_ID="$RAZORPAY_KEY_ID"
fi

read -p "Enter RAZORPAY_KEY_SECRET: " RAZORPAY_KEY_SECRET
if [ -n "$RAZORPAY_KEY_SECRET" ]; then
  supabase secrets set RAZORPAY_KEY_SECRET="$RAZORPAY_KEY_SECRET"
fi

read -p "Enter RAZORPAY_WEBHOOK_SECRET (from Razorpay dashboard → Webhooks): " RAZORPAY_WEBHOOK_SECRET
if [ -n "$RAZORPAY_WEBHOOK_SECRET" ]; then
  supabase secrets set RAZORPAY_WEBHOOK_SECRET="$RAZORPAY_WEBHOOK_SECRET"
fi

# --- OPTIONAL: Stripe ---
echo ""
echo "--- Stripe (Optional — press Enter to skip) ---"
read -p "Enter STRIPE_SECRET_KEY: " STRIPE_SECRET_KEY
if [ -n "$STRIPE_SECRET_KEY" ]; then
  supabase secrets set STRIPE_SECRET_KEY="$STRIPE_SECRET_KEY"
fi

read -p "Enter STRIPE_WEBHOOK_SECRET: " STRIPE_WEBHOOK_SECRET
if [ -n "$STRIPE_WEBHOOK_SECRET" ]; then
  supabase secrets set STRIPE_WEBHOOK_SECRET="$STRIPE_WEBHOOK_SECRET"
fi

# --- OPTIONAL: Gemini (for agentChat) ---
echo ""
echo "--- Gemini AI (Optional — for agent chat) ---"
read -p "Enter GEMINI_API_KEY: " GEMINI_API_KEY
if [ -n "$GEMINI_API_KEY" ]; then
  supabase secrets set GEMINI_API_KEY="$GEMINI_API_KEY"
fi

# --- OPTIONAL: Firebase Push ---
echo ""
echo "--- Firebase Push (Optional — press Enter to skip) ---"
read -p "Enter FIREBASE_PROJECT_ID: " FIREBASE_PROJECT_ID
if [ -n "$FIREBASE_PROJECT_ID" ]; then
  supabase secrets set FIREBASE_PROJECT_ID="$FIREBASE_PROJECT_ID"
fi

read -p "Enter FIREBASE_CLIENT_EMAIL: " FIREBASE_CLIENT_EMAIL
if [ -n "$FIREBASE_CLIENT_EMAIL" ]; then
  supabase secrets set FIREBASE_CLIENT_EMAIL="$FIREBASE_CLIENT_EMAIL"
fi

read -p "Enter FIREBASE_PRIVATE_KEY: " FIREBASE_PRIVATE_KEY
if [ -n "$FIREBASE_PRIVATE_KEY" ]; then
  supabase secrets set FIREBASE_PRIVATE_KEY="$FIREBASE_PRIVATE_KEY"
fi

# --- OPTIONAL: Twilio OTP ---
echo ""
echo "--- Twilio OTP (Optional — press Enter to skip) ---"
read -p "Enter TWILIO_ACCOUNT_SID: " TWILIO_ACCOUNT_SID
if [ -n "$TWILIO_ACCOUNT_SID" ]; then
  supabase secrets set TWILIO_ACCOUNT_SID="$TWILIO_ACCOUNT_SID"
fi

read -p "Enter TWILIO_AUTH_TOKEN: " TWILIO_AUTH_TOKEN
if [ -n "$TWILIO_AUTH_TOKEN" ]; then
  supabase secrets set TWILIO_AUTH_TOKEN="$TWILIO_AUTH_TOKEN"
fi

read -p "Enter TWILIO_PHONE_NUMBER: " TWILIO_PHONE_NUMBER
if [ -n "$TWILIO_PHONE_NUMBER" ]; then
  supabase secrets set TWILIO_PHONE_NUMBER="$TWILIO_PHONE_NUMBER"
fi

echo ""
echo "=========================================="
echo "  Secrets set successfully!"
echo "  Now run: ./supabase/deploy_all.sh"
echo "=========================================="