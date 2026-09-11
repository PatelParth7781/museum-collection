import { Link, useLocation } from 'react-router-dom';
import { LogIn, UserPlus } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';

export function AuthPromptModal({
  open,
  onClose,
  action = 'interact with the collection',
}: {
  open: boolean;
  onClose: () => void;
  action?: string;
}) {
  const location = useLocation();
  const returnPath = `${location.pathname}${location.search}`;
  const destination = encodeURIComponent(returnPath);

  return (
    <Modal open={open} onClose={onClose} title="Login Required" size="sm">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">
          <LogIn size={22} />
        </div>
        <p className="text-sm leading-relaxed text-stone-600">
          Please log in or create an account to {action}.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link
            to={`/login?returnTo=${destination}`}
            onClick={onClose}
            className="btn-primary justify-center"
          >
            <LogIn size={16} /> Login
          </Link>
          <Link
            to={`/register?returnTo=${destination}`}
            onClick={onClose}
            className="btn-secondary justify-center"
          >
            <UserPlus size={16} /> Create Account
          </Link>
        </div>
        <button onClick={onClose} className="mt-4 text-sm text-stone-500 hover:text-stone-800">
          Continue Browsing
        </button>
      </div>
    </Modal>
  );
}
