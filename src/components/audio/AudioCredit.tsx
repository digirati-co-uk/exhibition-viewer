import type { MetadataItem } from "@iiif/presentation-3";
import { useMemo } from "react";
import { LocaleString } from "react-iiif-vault";
import { sanitizeCreditStatement } from "./credit-html";

/** Required-statement text below the audio label, inside the controls revealed after first play. */
export function AudioCredit({ statement }: { statement: MetadataItem }) {
  const safe = useMemo(() => sanitizeCreditStatement(statement), [statement]);

  return (
    <div className="exv-audio-credit" data-audio-credit>
      {safe.label ? (
        <LocaleString as="span" enableDangerouslySetInnerHTML className="exv-audio-credit-label">
          {safe.label}
        </LocaleString>
      ) : null}
      {/* A real space keeps "Attribution Audio: …" from running together for assistive tech and copy/paste. */}
      {safe.label ? " " : null}
      <LocaleString as="span" enableDangerouslySetInnerHTML className="exv-audio-credit-value">
        {safe.value}
      </LocaleString>
    </div>
  );
}
