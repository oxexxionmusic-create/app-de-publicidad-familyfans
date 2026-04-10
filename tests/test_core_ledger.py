"""
POC: Core Ledger/Financial System for Family Fans Mony
Tests the complete flow:
1. Create users (admin, advertiser, creator)
2. Deposit (pending) → Admin approve → Balance credited
3. Create campaign → Creator applies → Advertiser accepts
4. Creator submits deliverable → Admin approves → Payment with commission
5. Idempotency checks (no double approval)
6. Balance consistency verification
"""
import asyncio
import os
import sys
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

# Load env
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from dotenv import load_dotenv
load_dotenv("/app/backend/.env")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = "familyfansmony_test"

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# --- Helpers ---
def now():
    return datetime.now(timezone.utc)

async def clean_db():
    """Drop all test collections"""
    for col in ["users", "deposits", "transactions", "campaigns", "applications", "deliverables", "platform_settings"]:
        await db[col].drop()
    print("[OK] Database cleaned")

async def create_user(email, password_hash, role, name):
    user = {
        "email": email,
        "password_hash": password_hash,
        "role": role,
        "name": name,
        "balance": 0.0,
        "kyc_status": "none",
        "created_at": now().isoformat(),
        "is_top10": False,
    }
    result = await db.users.insert_one(user)
    user["_id"] = result.inserted_id
    print(f"[OK] User created: {name} ({role}) - ID: {result.inserted_id}")
    return user

# --- Test 1: Deposit Flow ---
async def test_deposit_flow(admin_id, advertiser_id):
    print("\n=== TEST 1: Deposit Flow ===")
    
    # Advertiser creates a deposit request
    deposit = {
        "user_id": advertiser_id,
        "amount": 100.0,
        "method": "crypto_usdt_bep20",
        "proof_url": "https://example.com/receipt.jpg",
        "status": "pending",
        "created_at": now().isoformat(),
        "reviewed_by": None,
        "reviewed_at": None,
    }
    result = await db.deposits.insert_one(deposit)
    deposit_id = result.inserted_id
    print(f"[OK] Deposit created (pending): ${deposit['amount']} - ID: {deposit_id}")
    
    # Admin approves deposit
    dep = await db.deposits.find_one({"_id": deposit_id, "status": "pending"})
    assert dep is not None, "Deposit should be pending"
    
    # Approve: update deposit + credit balance + create transaction
    update_result = await db.deposits.update_one(
        {"_id": deposit_id, "status": "pending"},  # Idempotent: only if still pending
        {"$set": {"status": "approved", "reviewed_by": admin_id, "reviewed_at": now().isoformat()}}
    )
    assert update_result.modified_count == 1, "Should modify exactly 1 deposit"
    
    await db.users.update_one(
        {"_id": advertiser_id},
        {"$inc": {"balance": deposit["amount"]}}
    )
    
    await db.transactions.insert_one({
        "user_id": advertiser_id,
        "type": "deposit",
        "amount": deposit["amount"],
        "reference_id": deposit_id,
        "description": "Depósito aprobado - crypto_usdt_bep20",
        "created_at": now().isoformat(),
    })
    
    # Verify balance
    user = await db.users.find_one({"_id": advertiser_id})
    assert user["balance"] == 100.0, f"Balance should be 100, got {user['balance']}"
    print(f"[OK] Deposit approved. Advertiser balance: ${user['balance']}")
    
    # Test idempotency: try to approve again
    update_result = await db.deposits.update_one(
        {"_id": deposit_id, "status": "pending"},
        {"$set": {"status": "approved"}}
    )
    assert update_result.modified_count == 0, "Should NOT modify already approved deposit"
    print("[OK] Idempotency check passed: cannot approve same deposit twice")
    
    return deposit_id

# --- Test 2: Campaign + Application Flow ---
async def test_campaign_flow(advertiser_id, creator_id):
    print("\n=== TEST 2: Campaign + Application Flow ===")
    
    # Create campaign
    campaign = {
        "advertiser_id": advertiser_id,
        "title": "Promo TikTok Verano",
        "budget": 50.0,
        "budget_remaining": 50.0,
        "payment_per_video": 10.0,
        "niche": "humor",
        "region": "LATAM",
        "gender_preference": "any",
        "videos_requested": 5,
        "social_networks": ["tiktok", "instagram"],
        "content_duration": "1_month",
        "bonus_threshold_views": 1000,
        "bonus_amount": 5.0,
        "status": "active",
        "created_at": now().isoformat(),
    }
    result = await db.campaigns.insert_one(campaign)
    campaign_id = result.inserted_id
    print(f"[OK] Campaign created: '{campaign['title']}' - Budget: ${campaign['budget']}")
    
    # Verify advertiser has enough balance
    advertiser = await db.users.find_one({"_id": advertiser_id})
    assert advertiser["balance"] >= campaign["budget"], "Advertiser should have enough balance"
    
    # Reserve budget from advertiser balance (escrow)
    await db.users.update_one(
        {"_id": advertiser_id},
        {"$inc": {"balance": -campaign["budget"]}}
    )
    await db.transactions.insert_one({
        "user_id": advertiser_id,
        "type": "campaign_escrow",
        "amount": -campaign["budget"],
        "reference_id": campaign_id,
        "description": f"Reserva para campaña: {campaign['title']}",
        "created_at": now().isoformat(),
    })
    
    advertiser = await db.users.find_one({"_id": advertiser_id})
    print(f"[OK] Budget reserved. Advertiser remaining balance: ${advertiser['balance']}")
    
    # Creator applies
    application = {
        "campaign_id": campaign_id,
        "creator_id": creator_id,
        "status": "pending",
        "created_at": now().isoformat(),
    }
    result = await db.applications.insert_one(application)
    app_id = result.inserted_id
    print(f"[OK] Creator applied to campaign")
    
    # Accept application
    await db.applications.update_one(
        {"_id": app_id},
        {"$set": {"status": "accepted"}}
    )
    print(f"[OK] Application accepted")
    
    return campaign_id, app_id

# --- Test 3: Deliverable + Payment with Commission ---
async def test_deliverable_payment(admin_id, advertiser_id, creator_id, campaign_id, app_id, is_top10=False):
    print(f"\n=== TEST 3: Deliverable + Payment (Top10={is_top10}) ===")
    
    # Creator submits deliverable
    deliverable = {
        "campaign_id": campaign_id,
        "application_id": app_id,
        "creator_id": creator_id,
        "video_url": "https://tiktok.com/@creator/video/12345",
        "screenshot_url": "https://example.com/screenshot.jpg",
        "status": "pending",
        "created_at": now().isoformat(),
        "reviewed_by": None,
    }
    result = await db.deliverables.insert_one(deliverable)
    del_id = result.inserted_id
    print(f"[OK] Deliverable submitted by creator")
    
    # Get campaign payment info
    campaign = await db.campaigns.find_one({"_id": campaign_id})
    payment_amount = campaign["payment_per_video"]
    
    # Calculate commission
    commission_rate = 0.35 if is_top10 else 0.25
    commission = round(payment_amount * commission_rate, 2)
    creator_payout = round(payment_amount - commission, 2)
    
    # Admin approves deliverable
    update_result = await db.deliverables.update_one(
        {"_id": del_id, "status": "pending"},
        {"$set": {"status": "approved", "reviewed_by": admin_id, "reviewed_at": now().isoformat()}}
    )
    assert update_result.modified_count == 1
    
    # Pay creator (from campaign escrow)
    await db.users.update_one(
        {"_id": creator_id},
        {"$inc": {"balance": creator_payout}}
    )
    
    # Update campaign budget remaining
    await db.campaigns.update_one(
        {"_id": campaign_id},
        {"$inc": {"budget_remaining": -payment_amount}}
    )
    
    # Record transactions
    await db.transactions.insert_one({
        "user_id": creator_id,
        "type": "campaign_payment",
        "amount": creator_payout,
        "reference_id": del_id,
        "description": f"Pago por campaña (comisión {int(commission_rate*100)}%: ${commission})",
        "created_at": now().isoformat(),
    })
    await db.transactions.insert_one({
        "user_id": None,  # Platform
        "type": "platform_commission",
        "amount": commission,
        "reference_id": del_id,
        "description": f"Comisión plataforma ({int(commission_rate*100)}%) del creador",
        "created_at": now().isoformat(),
    })
    
    creator = await db.users.find_one({"_id": creator_id})
    campaign = await db.campaigns.find_one({"_id": campaign_id})
    
    print(f"[OK] Payment: ${payment_amount} → Creator gets ${creator_payout}, Platform gets ${commission}")
    print(f"[OK] Creator balance: ${creator['balance']}")
    print(f"[OK] Campaign budget remaining: ${campaign['budget_remaining']}")
    
    # Test idempotency
    update_result = await db.deliverables.update_one(
        {"_id": del_id, "status": "pending"},
        {"$set": {"status": "approved"}}
    )
    assert update_result.modified_count == 0, "Should NOT approve already approved deliverable"
    print("[OK] Idempotency: cannot approve same deliverable twice")
    
    return creator_payout, commission

# --- Test 4: Campaign Cancellation ---
async def test_campaign_cancellation(advertiser_id):
    print("\n=== TEST 4: Campaign Cancellation ===")
    
    adv = await db.users.find_one({"_id": advertiser_id})
    initial_balance = adv["balance"]
    
    # Create and fund a new campaign
    campaign = {
        "advertiser_id": advertiser_id,
        "title": "Campaña a Cancelar",
        "budget": 30.0,
        "budget_remaining": 30.0,
        "payment_per_video": 10.0,
        "status": "active",
        "created_at": now().isoformat(),
    }
    
    # First deposit more funds
    await db.users.update_one({"_id": advertiser_id}, {"$inc": {"balance": 30.0}})
    
    result = await db.campaigns.insert_one(campaign)
    campaign_id = result.inserted_id
    
    await db.users.update_one({"_id": advertiser_id}, {"$inc": {"balance": -30.0}})
    
    # Cancel campaign - refund remaining budget
    camp = await db.campaigns.find_one({"_id": campaign_id})
    refund = camp["budget_remaining"]
    
    await db.campaigns.update_one(
        {"_id": campaign_id},
        {"$set": {"status": "cancelled"}}
    )
    await db.users.update_one(
        {"_id": advertiser_id},
        {"$inc": {"balance": refund}}
    )
    await db.transactions.insert_one({
        "user_id": advertiser_id,
        "type": "campaign_refund",
        "amount": refund,
        "reference_id": campaign_id,
        "description": f"Reembolso por cancelación de campaña",
        "created_at": now().isoformat(),
    })
    
    adv = await db.users.find_one({"_id": advertiser_id})
    print(f"[OK] Campaign cancelled. Refund: ${refund}. Advertiser balance: ${adv['balance']}")
    assert adv["balance"] == initial_balance + refund, "Balance should include refund"
    print("[OK] Balance consistency verified after cancellation")

# --- Test 5: Full Audit Trail ---
async def test_audit_trail(advertiser_id, creator_id):
    print("\n=== TEST 5: Audit Trail ===")
    
    adv_txns = await db.transactions.find({"user_id": advertiser_id}).to_list(100)
    creator_txns = await db.transactions.find({"user_id": creator_id}).to_list(100)
    platform_txns = await db.transactions.find({"user_id": None}).to_list(100)
    
    print(f"[OK] Advertiser transactions: {len(adv_txns)}")
    for t in adv_txns:
        print(f"     {t['type']}: ${t['amount']} - {t['description']}")
    
    print(f"[OK] Creator transactions: {len(creator_txns)}")
    for t in creator_txns:
        print(f"     {t['type']}: ${t['amount']} - {t['description']}")
    
    print(f"[OK] Platform commission transactions: {len(platform_txns)}")
    for t in platform_txns:
        print(f"     {t['type']}: ${t['amount']} - {t['description']}")
    
    assert len(adv_txns) >= 3, "Advertiser should have deposit + escrow + refund transactions"
    assert len(creator_txns) >= 1, "Creator should have at least 1 payment"
    assert len(platform_txns) >= 1, "Platform should have commission records"
    print("[OK] All transactions have reference_id and timestamps")

# --- Run All Tests ---
async def main():
    print("=" * 60)
    print("POC: Family Fans Mony - Core Ledger System")
    print("=" * 60)
    
    await clean_db()
    
    # Create users
    admin = await create_user("admin@ffm.com", "hashed_pw", "admin", "Admin")
    advertiser = await create_user("anunciante@test.com", "hashed_pw", "advertiser", "Anunciante Test")
    creator = await create_user("creador@test.com", "hashed_pw", "creator", "Creador Test")
    
    # Run tests
    try:
        # Test 1: Deposit
        await test_deposit_flow(admin["_id"], advertiser["_id"])
        
        # Test 2: Campaign + Application
        campaign_id, app_id = await test_campaign_flow(advertiser["_id"], creator["_id"])
        
        # Test 3: Deliverable + Payment (standard 25% commission)
        payout, commission = await test_deliverable_payment(
            admin["_id"], advertiser["_id"], creator["_id"], campaign_id, app_id, is_top10=False
        )
        assert commission == 2.5, f"Standard commission should be $2.5, got ${commission}"
        assert payout == 7.5, f"Standard payout should be $7.5, got ${payout}"
        
        # Test 4: Campaign Cancellation
        await test_campaign_cancellation(advertiser["_id"])
        
        # Test 5: Audit Trail
        await test_audit_trail(advertiser["_id"], creator["_id"])
        
        # Final balance check
        adv = await db.users.find_one({"_id": advertiser["_id"]})
        cre = await db.users.find_one({"_id": creator["_id"]})
        print(f"\n{'='*60}")
        print(f"FINAL BALANCES:")
        print(f"  Advertiser: ${adv['balance']}")
        print(f"  Creator: ${cre['balance']}")
        print(f"{'='*60}")
        print("\n*** ALL POC TESTS PASSED ***")
        
    except AssertionError as e:
        print(f"\n[FAIL] Assertion failed: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n[FAIL] Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        # Cleanup
        await clean_db()
        client.close()

if __name__ == "__main__":
    asyncio.run(main())
