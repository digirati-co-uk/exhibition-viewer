import type { Manifest } from "@iiif/presentation-3";
import { useState } from "react";
import {
  AtlasStoreProvider,
  LanguageProvider,
  type Manifest as Manifest4,
  ManifestContext,
  Vault4,
  VaultProvider,
  useManifest,
} from "react-iiif-vault/presentation-4";

export type ProviderProps = {
  manifest: Manifest | Manifest4 | string;
  language?: string;
  children: React.ReactNode;
  loading?: React.ReactNode;
  customVault?: Vault4;
  skipLoadManifest?: boolean;
};

export function Provider(props: ProviderProps) {
  const [vault] = useState(() => props.customVault || new Vault4());
  const manifestId = typeof props.manifest === "string" ? props.manifest : props.manifest.id;

  // Load manifest into vault, if passed in full object.
  if (!vault.requestStatus(manifestId) && !props.skipLoadManifest) {
    if (typeof props.manifest === "string") {
      // Then we remote load it.
      vault.loadManifest(props.manifest);
    } else {
      vault.loadManifestSync(props.manifest.id, JSON.parse(JSON.stringify(props.manifest)));
    }
  }

  return (
    <AtlasStoreProvider>
      <VaultProvider vault={vault}>
        <ManifestContext manifest={manifestId}>
          <LanguageProvider language={props.language || "en"}>
            <WaitForManifest loading={props.loading}>{props.children as any}</WaitForManifest>
          </LanguageProvider>
        </ManifestContext>
      </VaultProvider>
    </AtlasStoreProvider>
  );
}

function WaitForManifest(props: { loading: React.ReactNode; children: React.ReactNode }) {
  const manifest = useManifest();
  if (!manifest) {
    return props.loading || <div />;
  }

  return props.children;
}
