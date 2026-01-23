import type { Collection } from '@iiif/presentation-3';
import { createFileRoute, Link } from '@tanstack/react-router'
import { LocaleString } from 'react-iiif-vault';

export const Route = createFileRoute('/')({
  component: RouteComponent,
  loader: async () => {
    return fetch("https://heritage.tudelft.nl/iiif/stores/manifest-editor/collection.json")
      .then((r) => r.json()) as Promise<Collection>;
  }
})

function RouteComponent() {
  const collection = Route.useLoaderData();


  return (
    <div>
      <ul className="my-8 w-full text-center">
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
              <Link to="/preview/scroll" search={{ manifest }} className="hover:underline">
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
