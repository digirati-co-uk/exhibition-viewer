// React 19 supports the `inert` attribute at runtime, but the pinned @types/react@18 does not declare it.
import "react";

declare module "react" {
  interface HTMLAttributes<T> {
    inert?: boolean | undefined;
  }
}
