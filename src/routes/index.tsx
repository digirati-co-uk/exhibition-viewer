import type { Collection } from "@iiif/presentation-3";
import { createFileRoute, Link } from "@tanstack/react-router";
import { LocaleString } from "react-iiif-vault";

export const Route = createFileRoute("/")({
    component: RouteComponent,
    loader: async () => {
        return fetch("https://heritage.tudelft.nl/iiif/stores/manifest-editor/collection.json").then(
            (r) => r.json()
        ) as Promise<Collection>;
    },
});

function RouteComponent() {
    const collection = Route.useLoaderData();
    
    const localManifest = "/hardcoded.json";
    const mockNonLinearTour = "/mock-non-linear-tour.json";
    
    return (
        <div>
            <ul className="my-8 w-full text-center">
                <li key="hardcoded-tour" className="pb-4 text-2xl">
                    <Link to="/preview/delft" search={{ manifest: localManifest }} className="hover:underline">
                        Test manual tour - Noives
                    </Link>{" "}
                    (
                    <Link
                        to="/preview/scroll"
                        search={{
                            manifest: localManifest,
                            minimal: false,
                            manifestEditorPreview: false,
                            manifestEditorPreviewOrigin: undefined,
                        }}
                        className="hover:underline"
                    >
                        Scroll
                    </Link>
                    )
                </li>
                <li key="mock-non-linear-tour" className="pb-4 text-2xl">
                    Test non-linear tour (
                    <Link to="/preview/delft" search={{ manifest: mockNonLinearTour }} className="hover:underline">
                        Full page
                    </Link>
                    {" | "}
                    <Link to="/preview/slideshow" search={{ manifest: mockNonLinearTour }} className="hover:underline">
                        Slideshow
                    </Link>
                    {" | "}
                    <Link
                        to="/preview/scroll"
                        search={{
                            manifest: mockNonLinearTour,
                            minimal: false,
                            manifestEditorPreview: false,
                            manifestEditorPreviewOrigin: undefined,
                        }}
                        className="hover:underline"
                    >
                        Scroll
                    </Link>
                    )
                </li>
                
                {collection.items.map((item: any) => {
                    const manifest = item.id;
                    
                    return (
                        <li key={item.id} className="pb-4 text-2xl">
                            <Link to="/preview/delft" search={{ manifest }} className="hover:underline">
                                <LocaleString>{item.label}</LocaleString>
                            </Link>{" "}
                            (
                            <Link to="/preview/slideshow" search={{ manifest }} className="hover:underline">
                                Slideshow
                            </Link>
                            {" | "}
                            <Link
                                to="/preview/scroll"
                                search={{
                                    manifest,
                                    minimal: false,
                                    manifestEditorPreview: false,
                                    manifestEditorPreviewOrigin: undefined,
                                }}
                                className="hover:underline"
                            >
                                Scroll
                            </Link>
                            {" | "}
                            <Link to="/preview/minimal" search={{ manifest }} className="hover:underline">
                                Minimal
                            </Link>
                            )
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
