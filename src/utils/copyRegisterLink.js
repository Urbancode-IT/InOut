import { toast } from 'react-toastify';

export function getRegistrationUrl() {
  return `${window.location.origin}/register`;
}

/** Copy employee registration URL to clipboard and toast "Copied". */
export async function copyRegisterLink() {
  const registrationUrl = getRegistrationUrl();
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(registrationUrl);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = registrationUrl;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    toast.success('Copied');
    return true;
  } catch (err) {
    console.error('Failed to copy registration link:', err);
    toast.error('Could not copy registration link');
    return false;
  }
}
