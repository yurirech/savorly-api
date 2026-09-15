import { ImportForm } from "../../../src/components/ImportForm";

export default function WebsiteImportScreen() {
  return (
    <ImportForm
      title="Recipe website"
      subtitle="We’ll look for structured recipe data first, then readable page text. Some sites block this — you can paste instead."
      label="Webpage URL"
      placeholder="https://..."
      keyboardType="url"
      buildRequest={(url) => ({ type: "website", url })}
    />
  );
}
