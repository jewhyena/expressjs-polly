export const getDataURI = (buffer: Buffer, mimetype: string) => {
  return "data:" + mimetype + ";base64," + buffer.toString("base64");
};
