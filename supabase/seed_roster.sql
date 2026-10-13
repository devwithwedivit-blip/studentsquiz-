-- Sample Roster Seed for Classes 9-12 with default PIN 1234
BEGIN;

INSERT INTO public.students (name, class, pin_hash, active)
VALUES ('आरव शर्मा (Aarav Sharma)', 9, '$2a$10$wOqZqW6K0jD/fG8jXw6f..Y6D2IeE5Lg/XJsm3N9v4C.gHn7ZfHfe', true)
ON CONFLICT (name, class) DO UPDATE SET active = true;

INSERT INTO public.students (name, class, pin_hash, active)
VALUES ('अनन्या वर्मा (Ananya Verma)', 9, '$2a$10$wOqZqW6K0jD/fG8jXw6f..Y6D2IeE5Lg/XJsm3N9v4C.gHn7ZfHfe', true)
ON CONFLICT (name, class) DO UPDATE SET active = true;

INSERT INTO public.students (name, class, pin_hash, active)
VALUES ('रोहन गुप्ता (Rohan Gupta)', 9, '$2a$10$wOqZqW6K0jD/fG8jXw6f..Y6D2IeE5Lg/XJsm3N9v4C.gHn7ZfHfe', true)
ON CONFLICT (name, class) DO UPDATE SET active = true;

INSERT INTO public.students (name, class, pin_hash, active)
VALUES ('प्रिया सिंह (Priya Singh)', 9, '$2a$10$wOqZqW6K0jD/fG8jXw6f..Y6D2IeE5Lg/XJsm3N9v4C.gHn7ZfHfe', true)
ON CONFLICT (name, class) DO UPDATE SET active = true;

INSERT INTO public.students (name, class, pin_hash, active)
VALUES ('आदित्य कुमार (Aditya Kumar)', 10, '$2a$10$wOqZqW6K0jD/fG8jXw6f..Y6D2IeE5Lg/XJsm3N9v4C.gHn7ZfHfe', true)
ON CONFLICT (name, class) DO UPDATE SET active = true;

INSERT INTO public.students (name, class, pin_hash, active)
VALUES ('दीया पटेल (Diya Patel)', 10, '$2a$10$wOqZqW6K0jD/fG8jXw6f..Y6D2IeE5Lg/XJsm3N9v4C.gHn7ZfHfe', true)
ON CONFLICT (name, class) DO UPDATE SET active = true;

INSERT INTO public.students (name, class, pin_hash, active)
VALUES ('कृष अग्रवाल (Krish Agarwal)', 10, '$2a$10$wOqZqW6K0jD/fG8jXw6f..Y6D2IeE5Lg/XJsm3N9v4C.gHn7ZfHfe', true)
ON CONFLICT (name, class) DO UPDATE SET active = true;

INSERT INTO public.students (name, class, pin_hash, active)
VALUES ('समीरा खान (Sameera Khan)', 10, '$2a$10$wOqZqW6K0jD/fG8jXw6f..Y6D2IeE5Lg/XJsm3N9v4C.gHn7ZfHfe', true)
ON CONFLICT (name, class) DO UPDATE SET active = true;

INSERT INTO public.students (name, class, pin_hash, active)
VALUES ('विवेक जोशी (Vivek Joshi)', 11, '$2a$10$wOqZqW6K0jD/fG8jXw6f..Y6D2IeE5Lg/XJsm3N9v4C.gHn7ZfHfe', true)
ON CONFLICT (name, class) DO UPDATE SET active = true;

INSERT INTO public.students (name, class, pin_hash, active)
VALUES ('रिया बनर्जी (Riya Banerjee)', 11, '$2a$10$wOqZqW6K0jD/fG8jXw6f..Y6D2IeE5Lg/XJsm3N9v4C.gHn7ZfHfe', true)
ON CONFLICT (name, class) DO UPDATE SET active = true;

INSERT INTO public.students (name, class, pin_hash, active)
VALUES ('निखिल रेड्डी (Nikhil Reddy)', 11, '$2a$10$wOqZqW6K0jD/fG8jXw6f..Y6D2IeE5Lg/XJsm3N9v4C.gHn7ZfHfe', true)
ON CONFLICT (name, class) DO UPDATE SET active = true;

INSERT INTO public.students (name, class, pin_hash, active)
VALUES ('हर्षित मेहता (Harshit Mehta)', 12, '$2a$10$wOqZqW6K0jD/fG8jXw6f..Y6D2IeE5Lg/XJsm3N9v4C.gHn7ZfHfe', true)
ON CONFLICT (name, class) DO UPDATE SET active = true;

INSERT INTO public.students (name, class, pin_hash, active)
VALUES ('स्नेहा कुलश्रेष्ठ (Sneha Kulshreshtha)', 12, '$2a$10$wOqZqW6K0jD/fG8jXw6f..Y6D2IeE5Lg/XJsm3N9v4C.gHn7ZfHfe', true)
ON CONFLICT (name, class) DO UPDATE SET active = true;

INSERT INTO public.students (name, class, pin_hash, active)
VALUES ('सिद्धार्थ मल्होत्रा (Siddharth Malhotra)', 12, '$2a$10$wOqZqW6K0jD/fG8jXw6f..Y6D2IeE5Lg/XJsm3N9v4C.gHn7ZfHfe', true)
ON CONFLICT (name, class) DO UPDATE SET active = true;
COMMIT;