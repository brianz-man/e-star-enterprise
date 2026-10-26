import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle, Package, XCircle } from "lucide-react";
import { authApi } from "@/api/auth";
import { Button } from "@/components/common/Button";
import { Spinner } from "@/components/common/Spinner";
import { getApiError } from "@/utils/getApiError";

type Status = "loading" | "success" | "error";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [status, setStatus] = useState<Status>(token ? "loading" : "error");
  const [message, setMessage] = useState(
    token ? "" : "Verification link is invalid or missing.",
  );

  useEffect(() => {
    if (!token) return;

    authApi
      .verifyEmail({ token })
      .then((r) => {
        setStatus("success");
        setMessage(r.message ?? "Email verified successfully.");
      })
      .catch((e: unknown) => {
        setStatus("error");
        setMessage(
          getApiError(e, "Verification failed. The link may have expired."),
        );
      });
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gray-50">
      <div className="card w-full max-w-md p-8 text-center">
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 bg-brand-600 rounded-2xl flex items-center justify-center">
            <Package size={22} className="text-white" />
          </div>
        </div>

        {status === "loading" && (
          <>
            <Spinner size="lg" />
            <p className="mt-4 text-sm text-gray-500">Verifying your email…</p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
            <h1 className="text-xl font-black text-gray-900 mb-2">
              Email verified
            </h1>
            <p className="text-sm text-gray-500 mb-6">{message}</p>
            <Link to="/login">
              <Button fullWidth>Sign in</Button>
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle size={48} className="mx-auto text-red-500 mb-4" />
            <h1 className="text-xl font-black text-gray-900 mb-2">
              Verification failed
            </h1>
            <p className="text-sm text-gray-500 mb-6">{message}</p>
            <Link to="/account">
              <Button fullWidth variant="secondary">
                Go to account
              </Button>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
