export default class MetadataNotFoundError extends Error {

constructor(message: string) {
    super(message); // (1)
    this.name = "MetadataNotFoundError";
  }
}