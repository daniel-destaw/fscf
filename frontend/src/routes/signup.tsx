import { createFileRoute, Link as RouterLink, redirect } from "@tanstack/react-router"
import { RegistrationLayout } from "@/components/Common/RegistrationLayout"
import { SupplierRegistration } from "@/components/Onboarding/SupplierRegistration"
import { BuyerRegistration } from "@/components/Onboarding/BuyerRegistration"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { isLoggedIn } from "@/hooks/useAuth"

export const Route = createFileRoute("/signup")({
  component: SignUp,
  beforeLoad: async () => {
    if (isLoggedIn()) {
      throw redirect({
        to: "/",
      })
    }
  },
  head: () => ({
    meta: [
      {
        title: "Register - SCF",
      },
    ],
  }),
})

function SignUp() {
  return (
    <RegistrationLayout>
      <div className="w-full py-8 px-4 md:px-8">
        {/* Back to Login Button */}
        <div className="mb-6">
          <RouterLink to="/login">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Login
            </Button>
          </RouterLink>
        </div>

        <Tabs defaultValue="supplier" className="w-full">
          <div className="flex justify-center mb-8">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="supplier">Supplier</TabsTrigger>
              <TabsTrigger value="buyer">Buyer</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="supplier">
            <SupplierRegistration />
          </TabsContent>
          <TabsContent value="buyer">
            <BuyerRegistration />
          </TabsContent>
        </Tabs>
      </div>
    </RegistrationLayout>
  )
}

export default SignUp 