"""Pydantic models for the Insurance Tech Platform."""
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional, Dict, Any, Literal
from datetime import datetime, timezone
import uuid


def _id() -> str:
    return str(uuid.uuid4())


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


# ============ USER & AUTH ============
Role = Literal["customer", "admin", "agent", "partner", "claims_officer"]


class UserCreate(BaseModel):
    email: EmailStr
    phone: str
    full_name: str
    password: str
    role: Role = "customer"


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class OtpRequest(BaseModel):
    phone: str


class OtpVerify(BaseModel):
    phone: str
    code: str


class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=_id)
    email: EmailStr
    phone: str
    full_name: str
    role: Role = "customer"
    kyc_status: Literal["pending", "verified", "rejected"] = "pending"
    kyc_data: Dict[str, Any] = Field(default_factory=dict)
    risk_score: float = 0.5
    ltv: float = 0.0
    tags: List[str] = Field(default_factory=list)
    lead_stage: Literal["new", "qualified", "contacted", "quoted", "won", "lost"] = "new"
    lead_source: Optional[str] = None
    partner_id: Optional[str] = None
    created_at: str = Field(default_factory=_now)


class UserPublic(BaseModel):
    id: str
    email: str
    phone: str
    full_name: str
    role: str
    kyc_status: str
    risk_score: float
    ltv: float
    tags: List[str] = []
    lead_stage: str
    created_at: str


# ============ LEAD / CRM ============
class LeadUpdate(BaseModel):
    lead_stage: Optional[Literal["new", "qualified", "contacted", "quoted", "won", "lost"]] = None
    tags: Optional[List[str]] = None
    risk_score: Optional[float] = None


class Interaction(BaseModel):
    id: str = Field(default_factory=_id)
    user_id: str
    kind: Literal["call", "email", "chat", "action", "note", "sms"]
    title: str
    body: Optional[str] = None
    meta: Dict[str, Any] = Field(default_factory=dict)
    created_at: str = Field(default_factory=_now)


class InteractionCreate(BaseModel):
    user_id: str
    kind: Literal["call", "email", "chat", "action", "note", "sms"]
    title: str
    body: Optional[str] = None
    meta: Dict[str, Any] = Field(default_factory=dict)


# ============ PRODUCTS ============
class ProductAddon(BaseModel):
    name: str
    price: float


class FieldConfig(BaseModel):
    """Admin-controlled per-field toggle used by the quote form."""
    enabled: bool = True
    required: bool = True


# Default form config for Motor quote
DEFAULT_MOTOR_FORM_CONFIG = {
    "account_type": {"enabled": True, "required": True},
    "vehicle_reg": {"enabled": True, "required": True},
    "id_type": {"enabled": True, "required": True},
    "id_number": {"enabled": True, "required": True},
    "full_name": {"enabled": True, "required": True},
    "date_of_birth": {"enabled": True, "required": True},
    "postcode": {"enabled": True, "required": True},
    "email": {"enabled": True, "required": True},
    "cover_type": {"enabled": True, "required": True},
    "sum_insured": {"enabled": True, "required": True},
    "ncd_percent": {"enabled": True, "required": True},
    "addons": {"enabled": True, "required": False},
    "vehicle_lookup": {"enabled": True, "required": False},
}


# Default form config for PA quote
DEFAULT_PA_FORM_CONFIG = {
    "num_persons": {"enabled": True, "required": True},
    "full_name": {"enabled": True, "required": True},
    "id_type": {"enabled": True, "required": True},
    "id_number": {"enabled": True, "required": True},
    "gender": {"enabled": True, "required": True},
    "date_of_birth": {"enabled": True, "required": True},
    "nationality": {"enabled": True, "required": True},
    "occupation_class": {"enabled": True, "required": True},
    "email": {"enabled": True, "required": True},
    "phone": {"enabled": True, "required": True},
    "address": {"enabled": True, "required": False},
    "postcode": {"enabled": True, "required": True},
    "beneficiary_name": {"enabled": True, "required": True},
    "beneficiary_relationship": {"enabled": True, "required": True},
    "beneficiary_nric": {"enabled": True, "required": False},
}


class Product(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=_id)
    name: str
    category: Literal["travel", "health", "motor", "device", "pa", "home"]
    description: str
    base_premium: float
    currency: str = "USD"
    coverage_amount: float
    features: List[str] = Field(default_factory=list)
    addons: List[ProductAddon] = Field(default_factory=list)
    image_url: Optional[str] = None
    active: bool = True
    display_order: int = 100
    form_config: Dict[str, FieldConfig] = Field(default_factory=dict)
    meta: Dict[str, Any] = Field(default_factory=dict)
    created_at: str = Field(default_factory=_now)


class ProductCreate(BaseModel):
    name: str
    category: Literal["travel", "health", "motor", "device", "pa", "home"]
    description: str
    base_premium: float
    coverage_amount: float
    features: List[str] = []
    addons: List[ProductAddon] = []
    image_url: Optional[str] = None
    display_order: int = 100
    form_config: Dict[str, FieldConfig] = Field(default_factory=dict)


class ProductUpdate(BaseModel):
    """Admin editable product fields — all optional (partial update)."""
    name: Optional[str] = None
    description: Optional[str] = None
    base_premium: Optional[float] = None
    coverage_amount: Optional[float] = None
    features: Optional[List[str]] = None
    addons: Optional[List[ProductAddon]] = None
    image_url: Optional[str] = None
    active: Optional[bool] = None
    display_order: Optional[int] = None
    form_config: Optional[Dict[str, FieldConfig]] = None
    meta: Optional[Dict[str, Any]] = None  # rate tables (Health Secure+, etc.)


# ============ VEHICLE LOOKUP ============
class VehicleLookupInput(BaseModel):
    vehicle_reg: str


class VehicleLookupResult(BaseModel):
    vehicle_reg: str
    make: str
    model: str
    year: int
    engine_cc: int
    body_type: str
    market_value: float  # in USD (demo)
    ncd_eligible: float  # suggested NCD %
    source: str = "mock-ism-abi"


# ============ QUOTE ============
class TravelQuoteInput(BaseModel):
    model_config = ConfigDict(extra="ignore")
    product_id: str
    # Step 1 — Plan Selection (mirrors Tune Protect quote page)
    region: Literal["international", "domestic"] = "international"
    trip_type: Literal["single_return", "one_way", "annual"] = "single_return"
    destination: str = ""                  # main destination string for risk lookup
    destinations: List[str] = []           # multi-select
    traveler_type: Literal["individual", "family", "group"] = "individual"
    age_category: Literal["18_70", "70_plus", "child"] = "18_70"
    travelers: int = Field(ge=1, le=20, default=1)
    email: Optional[EmailStr] = None
    start_date: str
    end_date: str
    is_malaysian: bool = True
    accept_privacy: bool = True
    coverage_tier: Literal["basic", "premium", "vip"] = "basic"
    addons: List[str] = []
    # Step 2 — Personal Details (filled in step 2)
    full_name: Optional[str] = ""
    id_type: Optional[Literal["nric", "passport"]] = "nric"
    id_number: Optional[str] = ""
    phone: Optional[str] = ""
    address: Optional[str] = ""
    postcode: Optional[str] = ""
    # Beneficiary (optional)
    beneficiary_name: Optional[str] = ""
    beneficiary_relationship: Optional[str] = ""


class Quote(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=_id)
    user_id: Optional[str] = None
    product_id: str
    input: Dict[str, Any]
    base_premium: float
    addon_total: float
    tax: float
    total: float
    currency: str = "USD"
    risk_score: float = 0.5
    coverage_tier: str = "basic"
    created_at: str = Field(default_factory=_now)


# ============ POLICY ============
PolicyStatus = Literal["active", "expired", "cancelled", "pending"]


class Policy(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=_id)
    policy_number: str
    user_id: str
    product_id: str
    product_name: str
    category: str
    quote_id: Optional[str] = None
    payment_id: Optional[str] = None
    start_date: str
    end_date: str
    premium: float
    coverage_amount: float
    currency: str = "USD"
    status: PolicyStatus = "pending"
    meta: Dict[str, Any] = Field(default_factory=dict)
    created_at: str = Field(default_factory=_now)


# ============ CLAIMS ============
ClaimStatus = Literal["submitted", "under_review", "investigating", "approved", "rejected", "paid"]


class ClaimCreate(BaseModel):
    policy_id: str
    incident_date: str
    incident_type: str
    description: str
    amount_claimed: float
    documents: List[str] = []


class Claim(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=_id)
    claim_number: str
    policy_id: str
    user_id: str
    incident_date: str
    incident_type: str
    description: str
    amount_claimed: float
    amount_approved: float = 0.0
    documents: List[str] = Field(default_factory=list)
    status: ClaimStatus = "submitted"
    fraud_score: float = 0.0
    auto_approved: bool = False
    reviewer_notes: Optional[str] = None
    created_at: str = Field(default_factory=_now)


class ClaimAction(BaseModel):
    action: Literal["approve", "reject", "investigate"]
    notes: Optional[str] = None
    amount_approved: Optional[float] = None


# ============ PAYMENT ============
class CheckoutRequest(BaseModel):
    quote_id: str
    origin_url: str


class PaymentTransaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=_id)
    session_id: str
    user_id: Optional[str] = None
    quote_id: Optional[str] = None
    amount: float
    currency: str = "usd"
    payment_status: str = "initiated"
    status: str = "open"
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: str = Field(default_factory=_now)
    updated_at: str = Field(default_factory=_now)


# ============ AI CHAT ============
class ChatMessage(BaseModel):
    session_id: str
    message: str


class ChatRecord(BaseModel):
    id: str = Field(default_factory=_id)
    session_id: str
    user_id: Optional[str] = None
    role: Literal["user", "assistant"]
    content: str
    created_at: str = Field(default_factory=_now)


# ============ CAMPAIGNS / COUPONS ============
class Campaign(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=_id)
    name: str
    channel: Literal["email", "sms", "push", "voice"]
    segment: str
    message: str
    status: Literal["draft", "scheduled", "sent"] = "draft"
    created_at: str = Field(default_factory=_now)


class CampaignCreate(BaseModel):
    name: str
    channel: Literal["email", "sms", "push", "voice"]
    segment: str
    message: str


class Coupon(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=_id)
    code: str
    percent_off: float
    active: bool = True
    created_at: str = Field(default_factory=_now)


class CouponCreate(BaseModel):
    code: str
    percent_off: float


# ============ VOICE AI ============
class VoiceCall(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=_id)
    direction: Literal["inbound", "outbound"]
    user_id: Optional[str] = None
    phone: str
    purpose: Literal["lead_conversion", "renewal", "policy_query", "claims_help"]
    duration_sec: int = 0
    transcript: Optional[str] = None
    outcome: Optional[str] = None
    created_at: str = Field(default_factory=_now)


class VoiceCallCreate(BaseModel):
    direction: Literal["inbound", "outbound"]
    user_id: Optional[str] = None
    phone: str
    purpose: Literal["lead_conversion", "renewal", "policy_query", "claims_help"]
    transcript: Optional[str] = None
    outcome: Optional[str] = None
    duration_sec: int = 0


# ============ NOTIFICATIONS ============
class Notification(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=_id)
    user_id: str
    title: str
    body: str
    kind: Literal["info", "success", "warning", "danger"] = "info"
    read: bool = False
    created_at: str = Field(default_factory=_now)
