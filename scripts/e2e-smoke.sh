#!/usr/bin/env bash
# End-to-end smoke test for BidMarket API (production or local).
# Usage: ./scripts/e2e-smoke.sh [BASE_URL]
set -euo pipefail

BASE="${1:-https://bidmarket-liart.vercel.app}"
TS=$(date +%s)
BUYER="buyer-e2e-${TS}@test.com"
SELLER="seller-e2e-${TS}@test.com"
PASS="E2eTestPass123!"

pass() { echo "✓ $1"; }
fail() { echo "✗ $1"; exit 1; }

echo "BidMarket E2E smoke test"
echo "Base URL: $BASE"
echo ""

# Health
curl -sf "$BASE/api/health" >/dev/null || fail "health check"
pass "health"

# Register buyer
BREG=$(curl -sf -X POST "$BASE/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"E2E Buyer\",\"email\":\"$BUYER\",\"password\":\"$PASS\"}")
BTOKEN=$(echo "$BREG" | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")
pass "register buyer"

# Login buyer
curl -sf -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$BUYER\",\"password\":\"$PASS\"}" >/dev/null
pass "login buyer"

# Register seller
SREG=$(curl -sf -X POST "$BASE/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"E2E Seller\",\"email\":\"$SELLER\",\"password\":\"$PASS\"}")
STOKEN=$(echo "$SREG" | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")
pass "register seller"

# Become seller
BECOME=$(curl -sf -X POST "$BASE/api/seller/become" -H "Authorization: Bearer $STOKEN")
STOKEN=$(echo "$BECOME" | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")
pass "become seller"

# Create listing
CREATE=$(curl -sf -X POST "$BASE/api/seller/auctions" \
  -H "Authorization: Bearer $STOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"E2E Test Item","description":"Smoke test","category":"Other","imageUrl":"https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800","startPrice":10000,"bidIncrement":1000,"durationMinutes":120}')
AID=$(echo "$CREATE" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
pass "create listing ($AID)"

sleep 2

# Fetch auction
curl -sf "$BASE/api/auctions/$AID" >/dev/null || fail "get auction after create"
pass "get auction"

# Place bid
curl -sf -X POST "$BASE/api/auctions/$AID/bids" \
  -H "Authorization: Bearer $BTOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount":11000}' >/dev/null
pass "place bid"

# My bids
MYBIDS=$(curl -sf "$BASE/api/me/bids" -H "Authorization: Bearer $BTOKEN")
echo "$MYBIDS" | python3 -c "import sys,json; d=json.load(sys.stdin); assert any(a['id']=='$AID' for a in d), 'auction not in my bids'"
pass "my bids"

# Seller can't bid on own listing
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/auctions/$AID/bids" \
  -H "Authorization: Bearer $STOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount":12000}')
[ "$CODE" = "400" ] || fail "seller should not bid on own listing (got $CODE)"
pass "block self-bid"

# List auctions
COUNT=$(curl -sf "$BASE/api/auctions" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))")
[ "$COUNT" -ge 1 ] || fail "auctions list empty"
pass "list auctions ($COUNT total)"

# Pages
for path in "/" "/browse" "/seller" "/how-it-works"; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE$path")
  [ "$CODE" = "200" ] || fail "$path returned $CODE"
done
pass "key pages load"

echo ""
echo "All E2E checks passed."
