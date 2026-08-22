import { auth, defineMcp } from "@lovable.dev/mcp-js";
import searchBooks from "./tools/search-books";
import getBook from "./tools/get-book";
import listMyListings from "./tools/list-my-listings";
import listMyOrders from "./tools/list-my-orders";
import createListing from "./tools/create-listing";

const projectRef = import.meta.env['VITE_SUPABASE_PROJECT_ID'] ?? "project-ref-unset";

export default defineMcp({
  name: "the-book-ledger",
  title: "The book ledger",
  version: "0.1.0",
  instructions:
    "Tools for Book Ledger, a neighborhood marketplace for buying, selling and renting books. Search the catalogue, inspect a listing, review the signed-in user's own listings and orders, and create new listings (which require admin approval).",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [searchBooks, getBook, listMyListings, listMyOrders, createListing],
});
