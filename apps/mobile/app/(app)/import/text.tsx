import { ImportForm } from "../../../src/components/ImportForm";

export default function TextImportScreen() {
  return (
    <ImportForm
      title="Paste recipe text"
      subtitle="A full recipe, caption, transcript, or messy notes. Missing amounts stay missing."
      label="Recipe text"
      placeholder="Ingredients, steps, or a caption..."
      multiline
      buildRequest={(text) => ({ type: "text", text })}
    />
  );
}
