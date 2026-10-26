import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Package } from "lucide-react";
import { authApi } from "@/api/auth";
import { Input } from "@/components/common/Input";
import { Button } from "@/components/common/Button";
import { getApiError } from "@/utils/getApiError";
import toast from "react-hot-toast";

const schema = z
  .object({
    password: z
      .string()
      .min(8, "Min 8 characters")
      .regex(/[A-Z]/, "Needs uppercase")
      .regex(/[0-9]/, "Needs a number"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });
type Form = z.infer<typeof schema>;

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const nav = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Form>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: Form) => {
    if (!token) {
      toast.error("Reset link is invalid or missing.");
      return;
    }
    setLoading(true);
    try {
      await authApi.resetPassword({ token, password: data.password });
      toast.success("Password updated. You can sign in now.");
      nav("/login", { replace: true });
    } catch (e: unknown) {
      toast.error(getApiError(e, "Reset failed. The link may have expired."));
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gray-50">
        <div className="card w-full max-w-md p-8 text-center">
          <h1 className="text-xl font-black text-gray-900 mb-2">
            Invalid reset link
          </h1>
          <p className="text-sm text-gray-500 mb-6">
            This password reset link is missing or malformed.
          </p>
          <Link to="/forgot-password">
            <Button fullWidth>Request a new link</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gray-50">
      <div className="card w-full max-w-md p-8">
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 bg-brand-600 rounded-2xl flex items-center justify-center">
            <Package size={22} className="text-white" />
          </div>
        </div>

        <h1 className="text-2xl font-black text-gray-900 text-center mb-1">
          Choose a new password
        </h1>
        <p className="text-sm text-gray-500 text-center mb-7">
          Min 8 characters, with uppercase and a number.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="New password"
            type={showPw ? "text" : "password"}
            placeholder="••••••••"
            error={errors.password?.message}
            rightIcon={
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="hover:text-gray-700"
              >
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            }
            {...register("password")}
          />
          <Input
            label="Confirm password"
            type={showPw ? "text" : "password"}
            placeholder="••••••••"
            error={errors.confirm?.message}
            {...register("confirm")}
          />
          <Button type="submit" fullWidth size="lg" loading={loading}>
            Update password
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          <Link
            to="/login"
            className="text-brand-600 font-semibold hover:underline"
          >
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
