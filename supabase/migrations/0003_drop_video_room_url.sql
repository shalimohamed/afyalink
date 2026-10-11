-- AfyaLink database, part 3: video moved from Daily.co to LiveKit (2026-10-11).
-- Run this in the Supabase SQL Editor after 0001 and 0002.
--
-- A booking's LiveKit room is always called "consult-<booking id>", so the
-- room can be worked out from the booking's own key. Storing it as well would
-- be duplicate (derived) data, so the column is removed (3NF).

alter table public.bookings drop column if exists video_room_url;
