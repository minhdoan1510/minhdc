// resizeImage.ts — client-side downscale + compress before upload, so stored
// images stay small. Browser-only, but safe to import statically: it only
// touches the DOM inside the function body.
export function resizeImage(file: File, maxW = 1400): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        c.getContext("2d")!.drawImage(img, 0, 0, w, h);
        const isPng = /png/i.test(file.type);
        c.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
          isPng ? "image/png" : "image/jpeg",
          0.82
        );
      };
      img.onerror = reject;
      img.src = fr.result as string;
    };
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}
