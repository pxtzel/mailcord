// suppress `punycode` warning
// eslint-disable-next-line @typescript-eslint/unbound-method
const originalEmitter = process.emitWarning;

process.emitWarning = (warning, ...arguments_: any) => {
  if (
    typeof warning === 'string' && // check if warning is related to `punycode`
    arguments_[0] === 'DeprecationWarning' &&
    warning.includes('punycode')
  ) {
    return;
  }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  originalEmitter(warning, ...arguments_);
};
