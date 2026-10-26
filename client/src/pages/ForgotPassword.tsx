import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Package } from "lucide-react";
import { authApi } from "@/api/auth";
import { Input } from "@/components/common/Input";
import { Button } from "@/components/common/Button";
import { getApiError } from "@/utils/getApiError";
import toast from "react-hot-toast";

const schema = z.object({
  email: z.string().email("Invalid email address"),
});
type Form = z.infer<typeof schema>;

export default function ForgotPassword() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Form>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: Form) => {
    setLoading(true);
    try {
      await authApi.forgotPassword(data);
      setSent(true);
      toast.success("Check your inbox for a reset link.");
    } catch (e: unknown) {
      toast.error(getApiError(e, "Could not send reset email"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gray-50">
      <div className="card w-full max-w-md p-8">
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 bg-brand-600 rounded-2xl flex items-center justify-center">
            <Package size={22} className="text-white" />
          </div>
        </div>

        <h1 className="text-2xl font-black text-gray-900 text-center mb-1">
          Reset password
        </h1>
        <p className="text-sm text-gray-500 text-center mb-7">
          {sent
            ? "If an account exists for that email, we've sent a reset link."
            : "Enter your email and we'll send you a reset link."}
        </p>

        {!sent ? (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Email address"
              type="email"
              placeholder="you@example.com"
              error={errors.email?.message}
              {...register("email")}
            />
            <Button type="submit" fullWidth size="lg" loading={loading}>
              Send reset link
            </Button>
          </form>
        ) : (
          <Link to="/login">
            <Button fullWidth size="lg">
              Back to sign in
            </Button>
          </Link>
        )}

        <p className="text-center text-sm text-gray-500 mt-6">
          <Link
            to="/login"
            className="inline-flex items-center gap-1 text-brand-600 font-semibold hover:underline"
          >
            <ArrowLeft size={14} />
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
