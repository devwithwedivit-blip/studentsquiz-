-- Sample Roster Seed for Classes 9-12 with default PIN 1234
BEGIN;

INSERT INTO public.students (name, class, pin_hash, active)
VALUES ('Aarav Sharma', 9, '$2a$10$wOqZqW6K0jD/fG8jXw6f..Y6D2IeE5Lg/XJsm3N9v4C.gHn7ZfHfe', true)
ON CONFLICT (name, class) DO UPDATE SET active = true;

INSERT INTO public.students (name, class, pin_hash, active)
VALUES ('Ananya Verma', 9, '$2a$10$wOqZqW6K0jD/fG8jXw6f..Y6D2IeE5Lg/XJsm3N9v4C.gHn7ZfHfe', true)
ON CONFLICT (name, class) DO UPDATE SET active = true;

INSERT INTO public.students (name, class, pin_hash, active)
VALUES ('Rohan Gupta', 9, '$2a$10$wOqZqW6K0jD/fG8jXw6f..Y6D2IeE5Lg/XJsm3N9v4C.gHn7ZfHfe', true)
ON CONFLICT (name, class) DO UPDATE SET active = true;

INSERT INTO public.students (name, class, pin_hash, active)
VALUES ('Priya Singh', 9, '$2a$10$wOqZqW6K0jD/fG8jXw6f..Y6D2IeE5Lg/XJsm3N9v4C.gHn7ZfHfe', true)
ON CONFLICT (name, class) DO UPDATE SET active = true;

INSERT INTO public.students (name, class, pin_hash, active)
VALUES ('Aditya Kumar', 10, '$2a$10$wOqZqW6K0jD/fG8jXw6f..Y6D2IeE5Lg/XJsm3N9v4C.gHn7ZfHfe', true)
ON CONFLICT (name, class) DO UPDATE SET active = true;

INSERT INTO public.students (name, class, pin_hash, active)
VALUES ('Diya Patel', 10, '$2a$10$wOqZqW6K0jD/fG8jXw6f..Y6D2IeE5Lg/XJsm3N9v4C.gHn7ZfHfe', true)
ON CONFLICT (name, class) DO UPDATE SET active = true;

INSERT INTO public.students (name, class, pin_hash, active)
VALUES ('Krish Agarwal', 10, '$2a$10$wOqZqW6K0jD/fG8jXw6f..Y6D2IeE5Lg/XJsm3N9v4C.gHn7ZfHfe', true)
ON CONFLICT (name, class) DO UPDATE SET active = true;

INSERT INTO public.students (name, class, pin_hash, active)
VALUES ('Sameera Khan', 10, '$2a$10$wOqZqW6K0jD/fG8jXw6f..Y6D2IeE5Lg/XJsm3N9v4C.gHn7ZfHfe', true)
ON CONFLICT (name, class) DO UPDATE SET active = true;

INSERT INTO public.students (name, class, pin_hash, active)
VALUES ('Vivek Joshi', 11, '$2a$10$wOqZqW6K0jD/fG8jXw6f..Y6D2IeE5Lg/XJsm3N9v4C.gHn7ZfHfe', true)
ON CONFLICT (name, class) DO UPDATE SET active = true;

INSERT INTO public.students (name, class, pin_hash, active)
VALUES ('Riya Banerjee', 11, '$2a$10$wOqZqW6K0jD/fG8jXw6f..Y6D2IeE5Lg/XJsm3N9v4C.gHn7ZfHfe', true)
ON CONFLICT (name, class) DO UPDATE SET active = true;

INSERT INTO public.students (name, class, pin_hash, active)
VALUES ('Nikhil Reddy', 11, '$2a$10$wOqZqW6K0jD/fG8jXw6f..Y6D2IeE5Lg/XJsm3N9v4C.gHn7ZfHfe', true)
ON CONFLICT (name, class) DO UPDATE SET active = true;

INSERT INTO public.students (name, class, pin_hash, active)
VALUES ('Harshit Mehta', 12, '$2a$10$wOqZqW6K0jD/fG8jXw6f..Y6D2IeE5Lg/XJsm3N9v4C.gHn7ZfHfe', true)
ON CONFLICT (name, class) DO UPDATE SET active = true;

INSERT INTO public.students (name, class, pin_hash, active)
VALUES ('Sneha Kulshreshtha', 12, '$2a$10$wOqZqW6K0jD/fG8jXw6f..Y6D2IeE5Lg/XJsm3N9v4C.gHn7ZfHfe', true)
ON CONFLICT (name, class) DO UPDATE SET active = true;

INSERT INTO public.students (name, class, pin_hash, active)
VALUES ('Siddharth Malhotra', 12, '$2a$10$wOqZqW6K0jD/fG8jXw6f..Y6D2IeE5Lg/XJsm3N9v4C.gHn7ZfHfe', true)
ON CONFLICT (name, class) DO UPDATE SET active = true;

COMMIT;