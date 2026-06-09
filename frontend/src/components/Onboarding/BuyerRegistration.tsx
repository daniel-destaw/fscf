import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { LoadingButton } from "@/components/ui/loading-button"
import { PasswordInput } from "@/components/ui/password-input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import useAuth from "@/hooks/useAuth"

// Document requirement interface with conditional property
interface DocumentRequirement {
  id: string
  label: string
  required: boolean
  description: string
  conditional?: string
}

const buyerDocuments: DocumentRequirement[] = [
  { id: "businessLicense", label: "Trade / Business Licence", required: true, description: "Current Ethiopian trade bureau licence. Must match TIN and legal entity name." },
  { id: "tinCertificate", label: "TIN Registration Certificate", required: true, description: "ERCA-issued TIN certificate. Buyer TIN used in ERCA QR validation and dedup check." },
  { id: "auditedFinancials", label: "Audited Financial Statements", required: true, description: "Last 2 years minimum. Used to determine buyer risk grade and global exposure limit." },
  { id: "memorandumArticles", label: "Memorandum & Articles of Association", required: true, description: "Corporate constitution. Required for all company-type buyers to confirm legal standing." },
  { id: "beneficialOwnership", label: "Beneficial Ownership Declaration", required: true, description: "NBE AML/CFT requirement. Owner or All individuals with >10% ownership. Signed by authorised director." },
  { id: "nationalId", label: "National ID / Passport of Signatories", required: true, description: "Directors and finance officers who will operate the buyer portal. Used for sanctions screening." },
  { id: "boardResolution", label: "Board Resolution for SCF Programme", required: true, description: "Board resolution authorising participation in the bank's SCF programme and includes names of Finance Officers." },
  { id: "bankStatement", label: "Bank Statement (12 months)", required: true, description: "Used in buyer risk grading and to set the initial global exposure limit for the concentration risk engine." },
  { id: "bankConfirmation", label: "Bank Account Confirmation Letter", required: true, description: "Confirms account details for buyer payment settlement and reconciliation." },
  { id: "vatCertificate", label: "VAT Registration Certificate", required: true, description: "Required if buyer is VAT-registered. Used in VAT reconciliation during settlement." },
  { id: "proofOfAddress", label: "Proof of Registered Business Address", required: true, description: "Utility bill or municipality letter within 3 months. Required for KYB compliance." },
  { id: "creditRating", label: "Credit Rating / NBE Credit Bureau Report", required: false, description: "NBE credit bureau report or rating agency certificate.", conditional: "Required for buyer classification." },
  { id: "erpIntegration", label: "ERP Integration Letter of Intent", required: false, description: "If buyer intends to integrate SAP/Oracle via REST API.", conditional: "Initiates technical onboarding with IT team." },
]

// Form schema
const formSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  full_name: z.string().min(1, { message: "Full Name is required" }),
  password: z
    .string()
    .min(1, { message: "Password is required" })
    .min(8, { message: "Password must be at least 8 characters" }),
  confirm_password: z
    .string()
    .min(1, { message: "Password confirmation is required" }),
  entity_type: z.enum(["Buyer"]),
  tin_number: z.string().min(1, { message: "TIN Number is required" }),
  business_phone: z.string().min(1, { message: "Business phone is required" }),
  otp_consent: z.boolean(),
  terms_accepted: z.boolean(),
}).refine((data) => data.password === data.confirm_password, {
  message: "The passwords don't match",
  path: ["confirm_password"],
})

type FormData = z.infer<typeof formSchema>

export function BuyerRegistration() {
  const { signUpMutation } = useAuth()
  const [step, setStep] = useState(1)
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, File>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    criteriaMode: "all",
    defaultValues: {
      email: "",
      full_name: "",
      password: "",
      confirm_password: "",
      entity_type: "Buyer",
      tin_number: "",
      business_phone: "",
      otp_consent: false,
      terms_accepted: false,
    },
  })

  const handleFileUpload = (docId: string, file: File | null) => {
    if (file) {
      setUploadedFiles(prev => ({
        ...prev,
        [docId]: file
      }))
    }
  }

  const removeFile = (docId: string) => {
    const newFiles = { ...uploadedFiles }
    delete newFiles[docId]
    setUploadedFiles(newFiles)
  }

  const isRequiredDocumentsUploaded = () => {
    const requiredDocs = buyerDocuments.filter(doc => doc.required)
    return requiredDocs.every(doc => uploadedFiles[doc.id])
  }

  const isStep1Valid = () => {
    const values = form.getValues()
    const errors = form.formState.errors
    
    return (
      values.full_name.trim() !== "" &&
      values.email.trim() !== "" &&
      values.business_phone.trim() !== "" &&
      values.tin_number.trim() !== "" &&
      values.password.trim() !== "" &&
      values.confirm_password.trim() !== "" &&
      values.password === values.confirm_password &&
      Object.keys(errors).length === 0
    )
  }

  const handleNext = async () => {
    if (step === 1) {
      const isValid = await form.trigger([
        "full_name",
        "email",
        "business_phone",
        "tin_number",
        "entity_type",
        "password",
        "confirm_password"
      ])
      
      if (isValid && isStep1Valid()) {
        setStep(2)
      }
    } else if (step === 2) {
      if (isRequiredDocumentsUploaded()) {
        setStep(3)
      }
    }
  }

  const onSubmit = async (data: FormData) => {
    if (signUpMutation.isPending || isSubmitting) return
    
    setIsSubmitting(true)

    try {
      // 1. Register the buyer
      const { confirm_password, ...submitData } = data
      
      const registerResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/onboarding/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...submitData,
          entity_type: 'Buyer',
        }),
      })

      if (!registerResponse.ok) {
        const error = await registerResponse.json()
        throw new Error(error.detail || 'Registration failed')
      }

      const user = await registerResponse.json()
      console.log('User registered:', user)

      // 2. Upload all documents
      let allUploadsSuccessful = true
      const failedUploads: string[] = []
      
      for (const [docType, file] of Object.entries(uploadedFiles)) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('document_type', docType)

        try {
          const uploadResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/onboarding/upload-document/${user.id}`, {
            method: 'POST',
            body: formData,
          })

          if (!uploadResponse.ok) {
            console.error(`Failed to upload ${docType}`)
            allUploadsSuccessful = false
            failedUploads.push(docType)
          } else {
            const result = await uploadResponse.json()
            console.log(`Uploaded ${docType}:`, result)
          }
        } catch (error) {
          console.error(`Error uploading ${docType}:`, error)
          allUploadsSuccessful = false
          failedUploads.push(docType)
        }
      }

      if (allUploadsSuccessful) {
        alert('Buyer registration submitted successfully! You will be notified once approved.')
        window.location.href = '/login'
      } else {
        alert(`Registration completed but some documents failed to upload: ${failedUploads.join(', ')}. Please contact support.`)
      }
    } catch (error) {
      console.error('Registration error:', error)
      alert(error instanceof Error ? error.message : 'Registration failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Calculate upload progress
  const requiredDocs = buyerDocuments.filter(doc => doc.required)
  const uploadedRequiredCount = requiredDocs.filter(doc => uploadedFiles[doc.id]).length
  const uploadProgress = (uploadedRequiredCount / requiredDocs.length) * 100

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4 md:px-8">
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-3xl font-bold">Buyer Registration</CardTitle>
            <CardDescription className="text-base">
              Complete all required information to register as a buyer for Supply Chain Financing
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Progress Steps */}
            <div className="flex justify-between mb-8 max-w-2xl mx-auto">
              <div className="flex-1 text-center">
                <div className={`w-10 h-10 rounded-full mx-auto flex items-center justify-center text-sm font-semibold ${step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  1
                </div>
                <span className="text-sm text-muted-foreground mt-2 block">Account Setup</span>
              </div>
              <div className="flex-1 text-center">
                <div className={`w-10 h-10 rounded-full mx-auto flex items-center justify-center text-sm font-semibold ${step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  2
                </div>
                <span className="text-sm text-muted-foreground mt-2 block">Document Upload</span>
              </div>
              <div className="flex-1 text-center">
                <div className={`w-10 h-10 rounded-full mx-auto flex items-center justify-center text-sm font-semibold ${step >= 3 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  3
                </div>
                <span className="text-sm text-muted-foreground mt-2 block">Review & Submit</span>
              </div>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {step === 1 && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="full_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name *</FormLabel>
                            <FormControl>
                              <Input placeholder="John Doe" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email *</FormLabel>
                            <FormControl>
                              <Input placeholder="buyer@company.com" type="email" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="business_phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Business Phone *</FormLabel>
                            <FormControl>
                              <Input placeholder="+251 9XX XXX XXX" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="tin_number"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>TIN Number *</FormLabel>
                            <FormControl>
                              <Input placeholder="1234567890" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="entity_type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Entity Type *</FormLabel>
                            <FormControl>
                              <Input value="Buyer" disabled className="bg-muted" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password *</FormLabel>
                            <FormControl>
                              <PasswordInput placeholder="Password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="confirm_password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirm Password *</FormLabel>
                            <FormControl>
                              <PasswordInput placeholder="Confirm Password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Validation warning for step 1 */}
                    {!isStep1Valid() && (
                      <Alert variant="destructive" className="mt-4">
                        <AlertDescription>
                          Please fill in all required fields correctly before proceeding.
                        </AlertDescription>
                      </Alert>
                    )}
                  </>
                )}

                {step === 2 && (
                  <div className="space-y-4">
                    <Alert>
                      <AlertDescription>
                        Please upload all required documents. Supported formats: PDF, JPG, PNG (max 10MB each)
                      </AlertDescription>
                    </Alert>

                    {/* Upload Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Required Documents Progress</span>
                        <span>{uploadedRequiredCount} / {requiredDocs.length} uploaded</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary rounded-full h-2 transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {buyerDocuments.map((doc) => {
                        const isUploaded = !!uploadedFiles[doc.id]
                        const isRequired = doc.required
                        
                        return (
                          <Card 
                            key={doc.id} 
                            className={`overflow-hidden transition-all ${
                              isUploaded && isRequired 
                                ? 'border-green-500 bg-green-50 dark:bg-green-950/20' 
                                : isRequired && !isUploaded
                                ? 'border-destructive/50'
                                : ''
                            }`}
                          >
                            <CardHeader className="pb-2">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <CardTitle className="text-sm font-semibold flex items-center gap-2 flex-wrap">
                                    {doc.label}
                                    {isRequired && (
                                      <Badge 
                                        variant={isUploaded ? "outline" : "destructive"} 
                                        className={isUploaded ? "border-green-500 text-green-600 dark:text-green-400" : ""}
                                      >
                                        {isUploaded ? "✓ Uploaded" : "Required"}
                                      </Badge>
                                    )}
                                    {!isRequired && (
                                      <Badge variant="secondary">Conditional</Badge>
                                    )}
                                  </CardTitle>
                                  <CardDescription className="text-xs mt-1">
                                    {doc.description}
                                  </CardDescription>
                                  {doc.conditional && (
                                    <p className="text-xs text-orange-600 mt-1">{doc.conditional}</p>
                                  )}
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent>
                              {isUploaded ? (
                                <div className="flex items-center justify-between p-2 bg-green-100 dark:bg-green-900/30 rounded-md">
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    <span className="text-sm text-green-700 dark:text-green-300 truncate">
                                      {uploadedFiles[doc.id]?.name}
                                    </span>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeFile(doc.id)}
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                                  >
                                    Remove
                                  </Button>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <Input
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    onChange={(e) => {
                                      if (e.target.files?.[0]) {
                                        handleFileUpload(doc.id, e.target.files[0])
                                      }
                                    }}
                                    className={isRequired ? "border-destructive focus-visible:ring-destructive" : ""}
                                  />
                                  {isRequired && (
                                    <p className="text-xs text-destructive">
                                      * This document is required
                                    </p>
                                  )}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>

                    <div className="grid grid-cols-1 gap-4 mt-6">
                      <FormField
                        control={form.control}
                        name="otp_consent"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Mobile / OTP Consent *</FormLabel>
                              <FormDescription>
                                Consent to receive SMS OTPs on registered phone number
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="terms_accepted"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Platform Terms & Conditions *</FormLabel>
                              <FormDescription>
                                I accept the SCF platform terms and conditions
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Show warning if not all required docs are uploaded */}
                    {!isRequiredDocumentsUploaded() && (
                      <Alert variant="destructive">
                        <AlertDescription>
                          Please upload all required documents ({requiredDocs.length - uploadedRequiredCount} remaining) before proceeding.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-6">
                    <h3 className="font-semibold text-xl">Review Your Application</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm">Account Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <p className="text-sm break-all"><strong>Full Name:</strong> {form.getValues("full_name")}</p>
                          <p className="text-sm break-all"><strong>Email:</strong> {form.getValues("email")}</p>
                          <p className="text-sm"><strong>Business Phone:</strong> {form.getValues("business_phone")}</p>
                          <p className="text-sm"><strong>TIN Number:</strong> {form.getValues("tin_number")}</p>
                          <p className="text-sm"><strong>Entity Type:</strong> Buyer</p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm">Documents Uploaded</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-1 max-h-96 overflow-y-auto">
                            {Object.keys(uploadedFiles).length === 0 ? (
                              <p className="text-sm text-muted-foreground">No documents uploaded yet</p>
                            ) : (
                              Object.entries(uploadedFiles).map(([id, file]) => {
                                const doc = buyerDocuments.find(d => d.id === id)
                                return (
                                  <p key={id} className="text-sm text-green-600 truncate">
                                    ✓ {doc?.label}: {file.name}
                                  </p>
                                )
                              })
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Agreements</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-1">
                        <p className="text-sm">✓ OTP Consent</p>
                        <p className="text-sm">✓ Terms & Conditions Accepted</p>
                      </CardContent>
                    </Card>
                  </div>
                )}

                <div className="flex justify-between pt-6 border-t">
                  {step > 1 && (
                    <Button type="button" variant="outline" onClick={() => setStep(step - 1)} size="lg">
                      Previous
                    </Button>
                  )}
                  {step < 3 ? (
                    <Button 
                      type="button" 
                      onClick={handleNext}
                      size="lg"
                      className="ml-auto"
                      disabled={
                        (step === 1 && !isStep1Valid()) || 
                        (step === 2 && !isRequiredDocumentsUploaded())
                      }
                    >
                      Next
                    </Button>
                  ) : (
                    <LoadingButton 
                      type="submit" 
                      size="lg"
                      className="ml-auto"
                      loading={isSubmitting}
                      disabled={!isRequiredDocumentsUploaded()}
                    >
                      Submit Registration
                    </LoadingButton>
                  )}
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}