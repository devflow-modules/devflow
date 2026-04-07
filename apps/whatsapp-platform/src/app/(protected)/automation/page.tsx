import { AutomationClient } from "./AutomationClient";

export const metadata = {
  title: "Automação | WhatsApp Platform",
};

export default function AutomationPage() {
  return (
    <div className="mx-auto w-full max-w-4xl min-w-0 space-y-8">
      <AutomationClient />
    </div>
  );
}
