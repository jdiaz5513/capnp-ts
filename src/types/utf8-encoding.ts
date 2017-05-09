/**
 * Dirty workaround for bad type information in @types/utf8-encoding.
 *
 * @author jdiaz5513
 */

declare module 'utf8-encoding' {

  interface ITextDecoder {

    readonly encoding: string;

    fatal: boolean;

    ignoreBOM: boolean;

    decode(input?: ArrayBuffer|ArrayBufferView, options?: Object): string;

  }

  interface ITextEncoder {

    readonly encoding: string;

    encode(input?: string): Uint8Array;

  }

  const TextDecoder: {

      prototype: ITextDecoder;

      new (label?: string, options?: Object): ITextDecoder;

  };

  const TextEncoder: {

    prototype: ITextEncoder;

    new (utfLabel?: string): ITextEncoder;

  };

}
