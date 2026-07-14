import LoginView from "@/components/auth/views/LoginView";
import RegisterView from "@/components/auth/views/RegisterView";
import ForgotPasswordView from "@/components/auth/views/ForgotPasswordView";
import VerifyEmailView from "@/components/auth/views/VerifyEmailView";
import SuccessView from "@/components/auth/views/SuccessView";
import type { AuthView } from "@/components/auth/types";
import type { useAuthFormActions } from "@/components/auth/useAuthFormActions";

type AuthActions = ReturnType<typeof useAuthFormActions>;

type AuthViewRouterProps = {
  view: AuthView;
  idPrefix: string;
  pendingEmail: string;
  autoFocus: boolean;
  setPendingEmail: (email: string) => void;
  setView: (view: AuthView) => void;
  onClose?: () => void;
  actions: AuthActions;
};

const AuthViewRouter = ({
  view,
  idPrefix,
  pendingEmail,
  autoFocus,
  setPendingEmail,
  setView,
  onClose,
  actions,
}: AuthViewRouterProps) => {
  const {
    formLoading,
    socialLoading,
    handleGoogleSignIn,
    handleSignIn,
    handleSignUp,
    handleForgotPassword,
  } = actions;

  switch (view) {
    case "register":
      return (
        <RegisterView
          idPrefix={idPrefix}
          formLoading={formLoading}
          socialLoading={socialLoading}
          onGoogleSignIn={handleGoogleSignIn}
          onSignUp={(email, password, displayName) => {
            setPendingEmail(email);
            void handleSignUp(email, password, displayName);
          }}
          onLogin={() => setView("login")}
          autoFocus={autoFocus}
        />
      );
    case "forgot-password":
      return (
        <ForgotPasswordView
          idPrefix={idPrefix}
          formLoading={formLoading}
          initialEmail={pendingEmail}
          onSubmit={(email) => {
            setPendingEmail(email);
            void handleForgotPassword(email);
          }}
          onBack={() => setView("login")}
          autoFocus={autoFocus}
        />
      );
    case "verify-email":
      return (
        <VerifyEmailView
          email={pendingEmail}
          onBackToLogin={() => setView("login")}
        />
      );
    case "success":
      return (
        <SuccessView
          onContinue={() => {
            if (onClose) onClose();
          }}
        />
      );
    case "login":
    default:
      return (
        <LoginView
          idPrefix={idPrefix}
          formLoading={formLoading}
          socialLoading={socialLoading}
          onGoogleSignIn={handleGoogleSignIn}
          onSignIn={handleSignIn}
          onForgotPassword={() => setView("forgot-password")}
          onRegister={() => setView("register")}
          autoFocus={autoFocus}
        />
      );
  }
};

export default AuthViewRouter;
