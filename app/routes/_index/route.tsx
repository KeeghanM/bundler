import type { LoaderFunctionArgs } from "react-router";
import { redirect, Form, useLoaderData } from "react-router";

import { login } from "../../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return { showForm: Boolean(login) };
};

export default function App() {
  const { showForm } = useLoaderData<typeof loader>();

  return (
    <div className="min-h-screen bg-base-200 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-primary text-primary-content mb-6 shadow-lg">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <h1 className="text-4xl font-extrabold text-base-content tracking-tight mb-2">
          Bundler
        </h1>
        <p className="text-lg text-base-content/70">
          Supercharge your store with smart product bundles, priority rules, and deep analytics.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="card bg-base-100 shadow-xl border border-base-200">
          <div className="card-body">
            {showForm ? (
              <Form method="post" action="/auth/login" className="space-y-6">
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text font-medium">Shop domain</span>
                  </label>
                  <input
                    type="text"
                    name="shop"
                    placeholder="my-shop-domain.myshopify.com"
                    className="input input-bordered w-full focus:input-primary"
                    required
                  />
                </div>
                <div className="form-control mt-6">
                  <button type="submit" className="btn btn-primary w-full">
                    Log in
                  </button>
                </div>
              </Form>
            ) : (
              <div className="alert alert-warning">
                Login is currently disabled.
              </div>
            )}
          </div>
        </div>

        <div className="mt-10">
          <h2 className="text-sm font-semibold text-base-content/60 uppercase tracking-wide text-center mb-6">
            Why use Bundler?
          </h2>
          <ul className="space-y-4">
            <li className="flex items-start">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-success/20 text-success">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <div className="ml-3">
                <h3 className="text-md font-medium text-base-content">Automated Bundle Logic</h3>
                <p className="mt-1 text-sm text-base-content/70">
                  Set triggers based on products or collections. Exclude items on the fly. Let Bundler handle the math.
                </p>
              </div>
            </li>
            <li className="flex items-start">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-info/20 text-info">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                </div>
              </div>
              <div className="ml-3">
                <h3 className="text-md font-medium text-base-content">Priority Rules Engine</h3>
                <p className="mt-1 text-sm text-base-content/70">
                  Multiple overlapping bundles? Easily set priorities to ensure the correct discount applies to the cart.
                </p>
              </div>
            </li>
            <li className="flex items-start">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-secondary/20 text-secondary">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
              <div className="ml-3">
                <h3 className="text-md font-medium text-base-content">Deep Analytics</h3>
                <p className="mt-1 text-sm text-base-content/70">
                  Track widget views, add-to-carts, and completed applications to optimize your bundling strategy.
                </p>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
