import { type AllActions, Vault, type VaultOptions } from "@iiif/helpers/vault";
import type { BatchAction } from "@iiif/helpers/vault/actions";
import type { IIIFStore } from "@iiif/helpers/vault";

export const MANIFEST_EDITOR_PREVIEW_CONNECT = "manifest-editor:iframe-preview:connect";
export const MANIFEST_EDITOR_PREVIEW_READY = "manifest-editor:iframe-preview:ready";
export const MANIFEST_EDITOR_PREVIEW_SELECTION = "manifest-editor:iframe-preview:selection";

export type PreviewConnectionMessage = {
  _type: typeof MANIFEST_EDITOR_PREVIEW_CONNECT;
  resource: { id: string; type: string };
  canvasId?: string | null;
  annotationId?: string | null;
};

export type PreviewSelectionMessage = {
  _type: typeof MANIFEST_EDITOR_PREVIEW_SELECTION;
  resource?: { id: string; type: string };
  canvasId?: string | null;
  annotationId?: string | null;
};

type RemoteVaultAction = {
  _id: string;
  _type: "vault-action";
  _lastActionId: string;
  action: AllActions | BatchAction;
};

type RemoteVaultServerMessage =
  | RemoteVaultAction
  | {
      _id?: string;
      _type: "init-response";
      _lastActionId?: string;
      data: IIIFStore;
    }
  | {
      _id: string;
      _type: "vault-action-rejection";
      _lastActionId?: string;
      action: string;
    }
  | {
      _id: string;
      _type: "vault-action-confirmation";
      _lastActionId?: string;
      action: string;
    };

function randomId() {
  return `${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}

export class ManifestEditorMessagePortVault extends Vault {
  private port: MessagePort;
  private isReady = false;
  private isResetting = true;
  private queuedActions: Array<AllActions | BatchAction> = [];
  private pendingActions = new Map<string, AllActions | BatchAction>();
  private pendingActionOrder: string[] = [];
  private lastInitActionId = "@genesis";
  lastActionId = "@genesis";

  constructor(port: MessagePort, options?: Partial<VaultOptions>) {
    super(options);
    this.port = port;
    this.port.addEventListener("message", this.handleMessage);
    this.port.addEventListener("messageerror", this.handleClose);
    this.port.start();
    this.requestInitialState();
  }

  destroy() {
    this.port.removeEventListener("message", this.handleMessage);
    this.port.removeEventListener("messageerror", this.handleClose);
    this.isReady = false;
    this.port.close();
  }

  waitUntilReady = async () => {
    if (this.isReady) return;
    return new Promise<void>((resolve) => {
      const interval = window.setInterval(() => {
        if (this.isReady) {
          window.clearInterval(interval);
          resolve();
        }
      }, 50);
    });
  };

  dispatch(action: AllActions | BatchAction) {
    if (this.isResetting) {
      this.queuedActions.push(action);
      return;
    }
    if (!this.isReady) {
      throw new Error("Preview vault is not ready");
    }

    const wrappedAction: RemoteVaultAction = {
      _id: randomId(),
      _type: "vault-action",
      _lastActionId: this.lastInitActionId,
      action,
    };

    this.lastInitActionId = wrappedAction._id;
    super.dispatch(action);
    this.pendingActions.set(wrappedAction._id, action);
    this.pendingActionOrder.push(wrappedAction._id);
    this.port.postMessage(JSON.stringify(wrappedAction));
  }

  private requestInitialState() {
    this.port.postMessage(JSON.stringify({ _type: "init-request" }));
  }

  private handleMessage = (event: MessageEvent) => {
    const parsed = parseRemoteVaultMessage(event.data);
    if (!parsed) return;

    if (parsed._type === "init-response") {
      this.getStore().setState(parsed.data);
      this.isResetting = false;
      this.isReady = true;
      for (const action of this.queuedActions) {
        this.dispatch(action);
      }
      this.queuedActions = [];
      return;
    }

    if (parsed._type === "vault-action") {
      super.dispatch(parsed.action);
      this.lastActionId = parsed._id;
      return;
    }

    if (parsed._type === "vault-action-confirmation") {
      this.pendingActions.delete(parsed._id);
      this.pendingActionOrder = this.pendingActionOrder.filter((id) => id !== parsed._id);
      return;
    }

    if (parsed._type === "vault-action-rejection") {
      this.requestInitialState();
      this.isResetting = true;
      this.isReady = false;

      const action = this.pendingActions.get(parsed._id);
      if (action) {
        this.queuedActions = [action, ...this.queuedActions];
      }

      const rejectedActionIndex = this.pendingActionOrder.indexOf(parsed._id);
      if (rejectedActionIndex !== -1) {
        const actionsToQueue = this.pendingActionOrder
          .slice(rejectedActionIndex)
          .map((id) => this.pendingActions.get(id))
          .filter(Boolean) as Array<AllActions | BatchAction>;
        this.queuedActions = [...actionsToQueue, ...this.queuedActions];
      }

      this.pendingActions = new Map();
      this.pendingActionOrder = [];
    }
  };

  private handleClose = () => {
    this.isReady = false;
  };
}

function parseRemoteVaultMessage(data: unknown): RemoteVaultServerMessage | null {
  try {
    if (typeof data === "string") {
      return JSON.parse(data) as RemoteVaultServerMessage;
    }
    if (typeof data === "object" && data) {
      return data as RemoteVaultServerMessage;
    }
  } catch {
    return null;
  }
  return null;
}
