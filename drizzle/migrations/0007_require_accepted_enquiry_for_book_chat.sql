CREATE POLICY "Accepted enquiry or grandfathered book message"
ON public.messages
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (
  book_id IS NULL
  OR EXISTS (
    SELECT 1
    FROM public.enquiries e
    WHERE e.book_id = messages.book_id
      AND e.status = 'accepted'
      AND (
        (e.buyer_id = messages.from_id AND e.seller_id = messages.to_id)
        OR (e.buyer_id = messages.to_id AND e.seller_id = messages.from_id)
      )
  )
  OR EXISTS (
    SELECT 1
    FROM public.messages prior
    WHERE prior.book_id = messages.book_id
      AND (
        (prior.from_id = messages.from_id AND prior.to_id = messages.to_id)
        OR (prior.from_id = messages.to_id AND prior.to_id = messages.from_id)
      )
  )
);