import textTyps from "./text";
import imageTypes from "./image";

export { textTyps, imageTypes };

export type FTypes = {
  type: "image" | "text" | "binary";
  media: string;
};

export function inferTypes(name: string): FTypes {
  let epos = name.lastIndexOf(".");
  let ext = name.substring(epos < 0 ? 0 : epos + 1).toLowerCase();

  if (!!imageTypes[ext]) {
    let media = imageTypes[ext];
    return { type: "image", media };
  }

  if (!!textTyps[ext]) {
    let media = textTyps[ext];
    return { type: "text", media };
  }

  return { type: "binary", media: "application/octet-stream" };
}
