// Ambient declarations for the @editorjs tools that ship no .d.ts of their own.
// They are all Editor.js block/inline tool constructors, consumed only through
// the `tools` map in RichEditor.tsx.
declare module "@editorjs/raw" {
  const Raw: any;
  export default Raw;
}
declare module "@editorjs/link" {
  const LinkTool: any;
  export default LinkTool;
}
declare module "@editorjs/attaches" {
  const AttachesTool: any;
  export default AttachesTool;
}
declare module "@editorjs/personality" {
  const Personality: any;
  export default Personality;
}
declare module "@editorjs/simple-image" {
  const SimpleImage: any;
  export default SimpleImage;
}
declare module "@editorjs/text-variant-tune" {
  const TextVariantTune: any;
  export default TextVariantTune;
}
declare module "@editorjs/marker" {
  const Marker: any;
  export default Marker;
}
