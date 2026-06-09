import os
import shutil
from datetime import datetime
from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlmodel import Session, select
from app.core.db import get_db
from app.models import User, UserDocument, UserOnboardingRegister, UserApproval, UserPublic
from app.core.security import get_password_hash
from app.api.deps import get_current_active_superuser

router = APIRouter(prefix="/onboarding", tags=["onboarding"])

# Required documents for each entity type
REQUIRED_DOCUMENTS = {
    "Supplier": [
        "businessLicense", "tinCertificate", "auditedFinancials",
        "bankStatement", "memorandumArticles", "beneficialOwnership",
        "nationalId", "boardResolution", "proofOfAddress",
        "bankConfirmation", "sampleInvoice"
    ],
    "Buyer": [
        "businessLicense", "tinCertificate", "auditedFinancials",
        "memorandumArticles", "beneficialOwnership", "nationalId",
        "boardResolution", "bankStatement", "bankConfirmation",
        "vatCertificate", "proofOfAddress"
    ]
}

@router.post("/register", response_model=UserPublic)
async def register_user(
    registration: UserOnboardingRegister,
    db: Session = Depends(get_db)
):
    """Register a new Supplier or Buyer"""
    
    # Check if email exists
    existing_user = db.exec(
        select(User).where(User.email == registration.email)
    ).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Check if TIN exists
    existing_tin = db.exec(
        select(User).where(User.tin_number == registration.tin_number)
    ).first()
    if existing_tin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="TIN number already registered"
        )
    
    # Create new user
    new_user = User(
        email=registration.email,
        full_name=registration.full_name,
        hashed_password=get_password_hash(registration.password),
        entity_type=registration.entity_type,
        tin_number=registration.tin_number,
        business_phone=registration.business_phone,
        otp_consent=registration.otp_consent,
        terms_accepted=registration.terms_accepted,
        approval_status="pending",
        is_active=False,  # Not active until approved
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return new_user

@router.post("/upload-document/{user_id}")
async def upload_document(
    user_id: str,
    document_type: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """Upload a document for user registration (no authentication required)"""
    
    # Verify user exists
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Create upload directory
    upload_dir = f"uploads/documents/{user_id}"
    os.makedirs(upload_dir, exist_ok=True)
    
    # Save file
    file_extension = file.filename.split(".")[-1] if "." in file.filename else "pdf"
    safe_filename = f"{document_type}_{uuid4()}.{file_extension}"
    file_path = f"{upload_dir}/{safe_filename}"
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Save to database
    document = UserDocument(
        user_id=user_id,
        document_type=document_type,
        file_name=file.filename,
        file_path=file_path,
        file_size=file.size or 0,
        mime_type=file.content_type or "application/octet-stream"
    )
    
    db.add(document)
    
    # Check if all required documents are uploaded
    required_docs = REQUIRED_DOCUMENTS.get(user.entity_type, [])
    uploaded_docs = db.exec(
        select(UserDocument).where(UserDocument.user_id == user_id)
    ).all()
    uploaded_types = [doc.document_type for doc in uploaded_docs]
    
    if all(doc in uploaded_types for doc in required_docs):
        user.documents_uploaded = True
        db.add(user)
    
    db.commit()
    db.refresh(document)
    
    return {
        "message": "Document uploaded successfully",
        "document_id": str(document.id),
        "file_name": document.file_name
    }

@router.get("/documents/{user_id}")
async def get_user_documents(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_superuser)
):
    """Get all documents for a user (Admin only)"""
    
    documents = db.exec(
        select(UserDocument).where(UserDocument.user_id == user_id)
    ).all()
    
    return documents

@router.get("/pending")
async def get_pending_registrations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_superuser)
):
    """Get all pending user registrations (Admin only)"""
    
    users = db.exec(
        select(User).where(
            User.approval_status == "pending",
            User.is_superuser == False
        )
    ).all()
    
    return users

@router.post("/approve/{user_id}")
async def approve_user(
    user_id: str,
    approval: UserApproval,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_superuser)
):
    """Approve or reject user registration (Admin only)"""
    
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if approval.approved:
        user.approval_status = "approved"
        user.is_active = True
        user.approved_at = datetime.utcnow()
        user.approved_by = current_user.id
    else:
        user.approval_status = "rejected"
        user.is_active = False
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    return {
        "message": f"User {approval.approved and 'approved' or 'rejected'} successfully",
        "user_id": str(user.id),
        "status": user.approval_status
    }