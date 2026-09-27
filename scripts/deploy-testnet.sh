#!/usr/bin/env bash
# Deploy Kirogi to Monad testnet and point the web app at it.
#   scripts/deploy-testnet.sh
# Needs .env (gitignored) with DEPLOYER_KEY, funded with testnet MON (https://faucet.monad.xyz).
# The deployer is also the app's gas sponsor (RELAYER_KEY).
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; source .env; set +a
export PATH=/opt/homebrew/bin:$PATH

bal=$(cast balance "$DEPLOYER_ADDRESS" --rpc-url "$RPC_URL" --ether)
echo "deployer $DEPLOYER_ADDRESS has $bal MON"

# DOLLAR: official testnet stablecoin. usdc (Circle, default) or ausd (Agora).
case "${1:-usdc}" in
  usdc) export DOLLAR=0x534b2f3A21130d7a60830c2Df862319e593943A3 ;;
  ausd) export DOLLAR=0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC ;;
  *) echo "usage: $0 [usdc|ausd]"; exit 2 ;;
esac
TAG=${1:-usdc}
out=$(cd contracts && forge script script/Deploy.s.sol --rpc-url "$RPC_URL" --broadcast --private-key "$DEPLOYER_KEY" --gas-estimate-multiplier 110 2>&1)
echo "$out" | grep -E "DOLLAR|KIROGI|MARKET|PHARMACY|ARCADE|SUCCESS|Error"
DOLLAR=$(echo "$out" | awk '/^ +DOLLAR/{print $2}')
KIROGI=$(echo "$out" | awk '/^ +KIROGI/{print $2}')

cat > web/.env.testnet-$TAG <<EOF
NEXT_PUBLIC_CHAIN=testnet
NEXT_PUBLIC_RPC=https://testnet-rpc.monad.xyz
NEXT_PUBLIC_KIROGI=$KIROGI
NEXT_PUBLIC_DOLLAR=$DOLLAR
NEXT_PUBLIC_EXPLORER=https://testnet.monadvision.com
RELAYER_KEY=$DEPLOYER_KEY
EOF
printf 'KIROGI=%s\nDOLLAR=%s\n' "$KIROGI" "$DOLLAR" > deployments-testnet-$TAG.txt
cp web/.env.testnet-$TAG web/.env.production.local
echo "wrote web/.env.testnet-$TAG (active: web/.env.production.local) and deployments-testnet-$TAG.txt"
echo "explorer: https://testnet.monadvision.com/address/$KIROGI"
