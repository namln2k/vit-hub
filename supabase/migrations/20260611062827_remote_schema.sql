


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "citext" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."sport_type" AS ENUM (
    'badminton',
    'pickleball',
    'swimming'
);


ALTER TYPE "public"."sport_type" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_badminton_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_badminton_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_posts_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();

  if new.status = 'published' and old.status is distinct from 'published' then
    new.published_at = now();
  elsif new.status = 'draft' then
    new.published_at = null;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."set_posts_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."divisions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text" NOT NULL,
    "display_order" smallint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "divisions_description_not_empty" CHECK (("length"("btrim"("description")) > 0)),
    CONSTRAINT "divisions_name_not_empty" CHECK (("length"("btrim"("name")) > 0)),
    CONSTRAINT "divisions_slug_format" CHECK (("slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'::"text"))
);


ALTER TABLE "public"."divisions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."groups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid" DEFAULT "auth"."uid"(),
    CONSTRAINT "groups_name_not_blank" CHECK (("length"("btrim"("name")) > 0))
);


ALTER TABLE "public"."groups" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."home_featured_posts" (
    "post_id" "uuid" NOT NULL,
    "display_order" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "home_featured_posts_display_order_check" CHECK (("display_order" >= 0))
);


ALTER TABLE "public"."home_featured_posts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."posts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "content" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "published_at" timestamp with time zone,
    "thumbnail_url" "text",
    "thumbnail_image_key" "text",
    CONSTRAINT "posts_content_check" CHECK (("jsonb_typeof"("content") = 'array'::"text")),
    CONSTRAINT "posts_slug_check" CHECK (("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::"text")),
    CONSTRAINT "posts_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'published'::"text"]))),
    CONSTRAINT "posts_title_check" CHECK (("char_length"(TRIM(BOTH FROM "title")) > 0))
);


ALTER TABLE "public"."posts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sport_game_cost_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "game_id" "uuid" NOT NULL,
    "label" "text",
    "amount" numeric(12,2) NOT NULL,
    "created_by" "uuid" NOT NULL,
    "updated_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "badminton_game_cost_items_amount_non_negative" CHECK (("amount" >= (0)::numeric))
);


ALTER TABLE "public"."sport_game_cost_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sport_game_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "game_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "guest_name" "text",
    "guest_contact" "text",
    "role" "text" DEFAULT 'participant'::"text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "badminton_game_members_guest_contact_not_blank" CHECK ((("guest_contact" IS NULL) OR ("length"("btrim"("guest_contact")) > 0))),
    CONSTRAINT "badminton_game_members_guest_name_not_blank" CHECK ((("guest_name" IS NULL) OR ("length"("btrim"("guest_name")) > 0))),
    CONSTRAINT "badminton_game_members_identity_check" CHECK (((("user_id" IS NOT NULL) AND ("guest_name" IS NULL) AND ("guest_contact" IS NULL)) OR (("user_id" IS NULL) AND ("guest_name" IS NOT NULL)))),
    CONSTRAINT "badminton_game_members_role_check" CHECK (("role" = ANY (ARRAY['host'::"text", 'co_host'::"text", 'participant'::"text"]))),
    CONSTRAINT "badminton_game_members_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'left'::"text", 'kicked'::"text"])))
);


ALTER TABLE "public"."sport_game_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sport_game_payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "game_id" "uuid" NOT NULL,
    "member_id" "uuid" NOT NULL,
    "amount_override" numeric(12,2),
    "payment_status" "text" DEFAULT 'unpaid'::"text" NOT NULL,
    "payment_note" "text",
    "updated_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "badminton_game_payments_amount_override_non_negative" CHECK ((("amount_override" IS NULL) OR ("amount_override" >= (0)::numeric))),
    CONSTRAINT "badminton_game_payments_note_not_blank" CHECK ((("payment_note" IS NULL) OR ("length"("btrim"("payment_note")) > 0))),
    CONSTRAINT "badminton_game_payments_override_note_required" CHECK ((("amount_override" IS NULL) OR ("length"("btrim"(COALESCE("payment_note", ''::"text"))) > 0))),
    CONSTRAINT "badminton_game_payments_status_check" CHECK (("payment_status" = ANY (ARRAY['unpaid'::"text", 'paid'::"text"])))
);


ALTER TABLE "public"."sport_game_payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sport_games" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "host_user_id" "uuid" NOT NULL,
    "game_date" "date" NOT NULL,
    "game_time" time without time zone,
    "location_name" "text",
    "location_url" "text",
    "deleted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "type" "public"."sport_type" DEFAULT 'badminton'::"public"."sport_type" NOT NULL,
    CONSTRAINT "badminton_games_location_name_not_blank" CHECK ((("location_name" IS NULL) OR ("length"("btrim"("location_name")) > 0))),
    CONSTRAINT "badminton_games_location_url_not_blank" CHECK ((("location_url" IS NULL) OR ("length"("btrim"("location_url")) > 0))),
    CONSTRAINT "badminton_games_name_not_blank" CHECK (("length"("btrim"("name")) > 0))
);


ALTER TABLE "public"."sport_games" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "middle_name" "text",
    "username" "extensions"."citext" NOT NULL,
    "avatar_url" "text",
    "avatar_key" "text",
    "role" "text" DEFAULT 'member'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "nickname" "text" DEFAULT ''::"text" NOT NULL,
    "phone_number" "text" DEFAULT '-'::"text" NOT NULL,
    "school_name" "text",
    "enter_year" "text",
    "cohort" "text",
    "gender" smallint,
    CONSTRAINT "user_gender_check" CHECK ((("gender" IS NULL) OR ("gender" = ANY (ARRAY[0, 1])))),
    CONSTRAINT "user_role_check" CHECK (("role" = ANY (ARRAY['member'::"text", 'super_admin'::"text"]))),
    CONSTRAINT "user_username_format" CHECK (("username" OPERATOR("extensions".~) '^[A-Za-z0-9_]{3,20}$'::"extensions"."citext"))
);


ALTER TABLE "public"."user" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_divisions" (
    "user_id" "uuid" NOT NULL,
    "division_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_divisions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_groups" (
    "group_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid" DEFAULT "auth"."uid"()
);


ALTER TABLE "public"."user_groups" OWNER TO "postgres";


ALTER TABLE ONLY "public"."sport_game_payments"
    ADD CONSTRAINT "badminton_game_payments_member_unique" UNIQUE ("member_id");



ALTER TABLE ONLY "public"."divisions"
    ADD CONSTRAINT "divisions_display_order_key" UNIQUE ("display_order");



ALTER TABLE ONLY "public"."divisions"
    ADD CONSTRAINT "divisions_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."divisions"
    ADD CONSTRAINT "divisions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."divisions"
    ADD CONSTRAINT "divisions_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."groups"
    ADD CONSTRAINT "groups_name_unique" UNIQUE ("name");



ALTER TABLE ONLY "public"."groups"
    ADD CONSTRAINT "groups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."home_featured_posts"
    ADD CONSTRAINT "home_featured_posts_display_order_key" UNIQUE ("display_order");



ALTER TABLE ONLY "public"."home_featured_posts"
    ADD CONSTRAINT "home_featured_posts_pkey" PRIMARY KEY ("post_id");



ALTER TABLE ONLY "public"."posts"
    ADD CONSTRAINT "posts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."posts"
    ADD CONSTRAINT "posts_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."sport_game_cost_items"
    ADD CONSTRAINT "sport_game_cost_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sport_game_members"
    ADD CONSTRAINT "sport_game_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sport_game_payments"
    ADD CONSTRAINT "sport_game_payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sport_games"
    ADD CONSTRAINT "sport_games_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_divisions"
    ADD CONSTRAINT "user_divisions_pkey" PRIMARY KEY ("user_id", "division_id");



ALTER TABLE ONLY "public"."user_groups"
    ADD CONSTRAINT "user_groups_pkey" PRIMARY KEY ("group_id", "user_id");



ALTER TABLE ONLY "public"."user"
    ADD CONSTRAINT "user_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user"
    ADD CONSTRAINT "user_username_key" UNIQUE ("username");



CREATE INDEX "badminton_game_cost_items_game_id_idx" ON "public"."sport_game_cost_items" USING "btree" ("game_id");



CREATE INDEX "badminton_game_members_game_id_idx" ON "public"."sport_game_members" USING "btree" ("game_id");



CREATE UNIQUE INDEX "badminton_game_members_game_user_key" ON "public"."sport_game_members" USING "btree" ("game_id", "user_id") WHERE ("user_id" IS NOT NULL);



CREATE INDEX "badminton_game_members_user_id_idx" ON "public"."sport_game_members" USING "btree" ("user_id") WHERE ("user_id" IS NOT NULL);



CREATE INDEX "badminton_game_payments_game_id_idx" ON "public"."sport_game_payments" USING "btree" ("game_id");



CREATE INDEX "badminton_games_host_user_id_idx" ON "public"."sport_games" USING "btree" ("host_user_id");



CREATE UNIQUE INDEX "badminton_games_non_deleted_name_key" ON "public"."sport_games" USING "btree" ("lower"("name")) WHERE ("deleted_at" IS NULL);



CREATE INDEX "badminton_games_schedule_idx" ON "public"."sport_games" USING "btree" ("game_date", "game_time");



CREATE INDEX "divisions_display_order_idx" ON "public"."divisions" USING "btree" ("display_order");



CREATE INDEX "posts_status_updated_at_idx" ON "public"."posts" USING "btree" ("status", "updated_at" DESC);



CREATE INDEX "user_email_idx" ON "public"."user" USING "btree" ("email");



CREATE INDEX "user_groups_group_id_idx" ON "public"."user_groups" USING "btree" ("group_id");



CREATE INDEX "user_groups_user_id_idx" ON "public"."user_groups" USING "btree" ("user_id");



CREATE INDEX "user_username_idx" ON "public"."user" USING "btree" ("username");



CREATE OR REPLACE TRIGGER "set_badminton_game_cost_items_updated_at" BEFORE UPDATE ON "public"."sport_game_cost_items" FOR EACH ROW EXECUTE FUNCTION "public"."set_badminton_updated_at"();



CREATE OR REPLACE TRIGGER "set_badminton_game_members_updated_at" BEFORE UPDATE ON "public"."sport_game_members" FOR EACH ROW EXECUTE FUNCTION "public"."set_badminton_updated_at"();



CREATE OR REPLACE TRIGGER "set_badminton_game_payments_updated_at" BEFORE UPDATE ON "public"."sport_game_payments" FOR EACH ROW EXECUTE FUNCTION "public"."set_badminton_updated_at"();



CREATE OR REPLACE TRIGGER "set_badminton_games_updated_at" BEFORE UPDATE ON "public"."sport_games" FOR EACH ROW EXECUTE FUNCTION "public"."set_badminton_updated_at"();



CREATE OR REPLACE TRIGGER "set_divisions_updated_at" BEFORE UPDATE ON "public"."divisions" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_posts_updated_at" BEFORE UPDATE ON "public"."posts" FOR EACH ROW EXECUTE FUNCTION "public"."set_posts_updated_at"();



CREATE OR REPLACE TRIGGER "set_profiles_updated_at" BEFORE UPDATE ON "public"."user" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



ALTER TABLE ONLY "public"."sport_game_cost_items"
    ADD CONSTRAINT "badminton_game_cost_items_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."sport_game_cost_items"
    ADD CONSTRAINT "badminton_game_cost_items_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "public"."sport_games"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sport_game_cost_items"
    ADD CONSTRAINT "badminton_game_cost_items_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."sport_game_members"
    ADD CONSTRAINT "badminton_game_members_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "public"."sport_games"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sport_game_members"
    ADD CONSTRAINT "badminton_game_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sport_game_payments"
    ADD CONSTRAINT "badminton_game_payments_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "public"."sport_games"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sport_game_payments"
    ADD CONSTRAINT "badminton_game_payments_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."sport_game_members"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sport_game_payments"
    ADD CONSTRAINT "badminton_game_payments_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."sport_games"
    ADD CONSTRAINT "badminton_games_host_user_id_fkey" FOREIGN KEY ("host_user_id") REFERENCES "public"."user"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."groups"
    ADD CONSTRAINT "groups_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."home_featured_posts"
    ADD CONSTRAINT "home_featured_posts_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."posts"
    ADD CONSTRAINT "posts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."user_divisions"
    ADD CONSTRAINT "user_divisions_division_id_fkey" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_divisions"
    ADD CONSTRAINT "user_divisions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_groups"
    ADD CONSTRAINT "user_groups_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_groups"
    ADD CONSTRAINT "user_groups_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_groups"
    ADD CONSTRAINT "user_groups_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user"
    ADD CONSTRAINT "user_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Active account members can delete sport cost items" ON "public"."sport_game_cost_items" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."sport_games" "game"
     JOIN "public"."sport_game_members" "member" ON (("member"."game_id" = "game"."id")))
  WHERE (("game"."id" = "sport_game_cost_items"."game_id") AND ("game"."deleted_at" IS NULL) AND ("member"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("member"."status" = 'active'::"text")))));



CREATE POLICY "Active account members can insert sport cost items" ON "public"."sport_game_cost_items" FOR INSERT TO "authenticated" WITH CHECK ((("created_by" = ( SELECT "auth"."uid"() AS "uid")) AND ("updated_by" = ( SELECT "auth"."uid"() AS "uid")) AND (EXISTS ( SELECT 1
   FROM ("public"."sport_games" "game"
     JOIN "public"."sport_game_members" "member" ON (("member"."game_id" = "game"."id")))
  WHERE (("game"."id" = "sport_game_cost_items"."game_id") AND ("game"."deleted_at" IS NULL) AND ("member"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("member"."status" = 'active'::"text"))))));



CREATE POLICY "Active account members can insert sport payments" ON "public"."sport_game_payments" FOR INSERT TO "authenticated" WITH CHECK ((("updated_by" = ( SELECT "auth"."uid"() AS "uid")) AND (EXISTS ( SELECT 1
   FROM (("public"."sport_games" "game"
     JOIN "public"."sport_game_members" "actor" ON (("actor"."game_id" = "game"."id")))
     JOIN "public"."sport_game_members" "target" ON ((("target"."id" = "sport_game_payments"."member_id") AND ("target"."game_id" = "game"."id"))))
  WHERE (("game"."id" = "sport_game_payments"."game_id") AND ("game"."deleted_at" IS NULL) AND ("actor"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("actor"."status" = 'active'::"text") AND ("target"."status" = 'active'::"text"))))));



CREATE POLICY "Active account members can read sport cost items" ON "public"."sport_game_cost_items" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."sport_games" "game"
     JOIN "public"."sport_game_members" "member" ON (("member"."game_id" = "game"."id")))
  WHERE (("game"."id" = "sport_game_cost_items"."game_id") AND ("game"."deleted_at" IS NULL) AND ("member"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("member"."status" = 'active'::"text")))));



CREATE POLICY "Active account members can read sport payments" ON "public"."sport_game_payments" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM (("public"."sport_games" "game"
     JOIN "public"."sport_game_members" "actor" ON (("actor"."game_id" = "game"."id")))
     JOIN "public"."sport_game_members" "target" ON ((("target"."id" = "sport_game_payments"."member_id") AND ("target"."game_id" = "game"."id"))))
  WHERE (("game"."id" = "sport_game_payments"."game_id") AND ("game"."deleted_at" IS NULL) AND ("actor"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("actor"."status" = 'active'::"text") AND ("target"."status" = 'active'::"text")))));



CREATE POLICY "Active account members can update sport cost items" ON "public"."sport_game_cost_items" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."sport_games" "game"
     JOIN "public"."sport_game_members" "member" ON (("member"."game_id" = "game"."id")))
  WHERE (("game"."id" = "sport_game_cost_items"."game_id") AND ("game"."deleted_at" IS NULL) AND ("member"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("member"."status" = 'active'::"text"))))) WITH CHECK ((("updated_by" = ( SELECT "auth"."uid"() AS "uid")) AND (EXISTS ( SELECT 1
   FROM ("public"."sport_games" "game"
     JOIN "public"."sport_game_members" "member" ON (("member"."game_id" = "game"."id")))
  WHERE (("game"."id" = "sport_game_cost_items"."game_id") AND ("game"."deleted_at" IS NULL) AND ("member"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("member"."status" = 'active'::"text"))))));



CREATE POLICY "Active account members can update sport payments" ON "public"."sport_game_payments" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."sport_games" "game"
     JOIN "public"."sport_game_members" "actor" ON (("actor"."game_id" = "game"."id")))
  WHERE (("game"."id" = "sport_game_payments"."game_id") AND ("game"."deleted_at" IS NULL) AND ("actor"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("actor"."status" = 'active'::"text"))))) WITH CHECK ((("updated_by" = ( SELECT "auth"."uid"() AS "uid")) AND (EXISTS ( SELECT 1
   FROM (("public"."sport_games" "game"
     JOIN "public"."sport_game_members" "actor" ON (("actor"."game_id" = "game"."id")))
     JOIN "public"."sport_game_members" "target" ON ((("target"."id" = "sport_game_payments"."member_id") AND ("target"."game_id" = "game"."id"))))
  WHERE (("game"."id" = "sport_game_payments"."game_id") AND ("game"."deleted_at" IS NULL) AND ("actor"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("actor"."status" = 'active'::"text") AND ("target"."status" = 'active'::"text"))))));



CREATE POLICY "Anyone can read home featured posts" ON "public"."home_featured_posts" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Badminton hosts can create own games" ON "public"."sport_games" FOR INSERT TO "authenticated" WITH CHECK (("host_user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Badminton hosts can read own games" ON "public"."sport_games" FOR SELECT TO "authenticated" USING (("host_user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Badminton hosts can update unlocked own games" ON "public"."sport_games" FOR UPDATE TO "authenticated" USING ((("host_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("deleted_at" IS NULL) AND ((("game_date" + COALESCE("game_time", '23:59:59'::time without time zone)) AT TIME ZONE 'Asia/Ho_Chi_Minh'::"text") > "now"()))) WITH CHECK ((("host_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ((("game_date" + COALESCE("game_time", '23:59:59'::time without time zone)) AT TIME ZONE 'Asia/Ho_Chi_Minh'::"text") > "now"())));



CREATE POLICY "Badminton members can insert own account membership" ON "public"."sport_game_members" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("guest_name" IS NULL) AND ("guest_contact" IS NULL)));



CREATE POLICY "Badminton members can read own account membership" ON "public"."sport_game_members" FOR SELECT TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Badminton members can update own account membership" ON "public"."sport_game_members" FOR UPDATE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("guest_name" IS NULL) AND ("guest_contact" IS NULL)));



CREATE POLICY "Divisions are readable" ON "public"."divisions" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Published posts are readable" ON "public"."posts" FOR SELECT TO "authenticated", "anon" USING (("status" = 'published'::"text"));



CREATE POLICY "Super admins can add group members" ON "public"."user_groups" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user" "requester"
  WHERE (("requester"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("requester"."role" = 'super_admin'::"text")))));



CREATE POLICY "Super admins can create groups" ON "public"."groups" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user" "requester"
  WHERE (("requester"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("requester"."role" = 'super_admin'::"text")))));



CREATE POLICY "Super admins can create posts" ON "public"."posts" FOR INSERT TO "authenticated" WITH CHECK ((("created_by" = ( SELECT "auth"."uid"() AS "uid")) AND (EXISTS ( SELECT 1
   FROM "public"."user"
  WHERE (("user"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user"."role" = 'super_admin'::"text"))))));



CREATE POLICY "Super admins can delete groups" ON "public"."groups" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user" "requester"
  WHERE (("requester"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("requester"."role" = 'super_admin'::"text")))));



CREATE POLICY "Super admins can delete home featured posts" ON "public"."home_featured_posts" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user"
  WHERE (("user"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user"."role" = 'super_admin'::"text")))));



CREATE POLICY "Super admins can delete posts" ON "public"."posts" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user"
  WHERE (("user"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user"."role" = 'super_admin'::"text")))));



CREATE POLICY "Super admins can insert home featured posts" ON "public"."home_featured_posts" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user"
  WHERE (("user"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user"."role" = 'super_admin'::"text")))));



CREATE POLICY "Super admins can manage user divisions" ON "public"."user_divisions" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user"
  WHERE (("user"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user"."role" = 'super_admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user"
  WHERE (("user"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user"."role" = 'super_admin'::"text")))));



CREATE POLICY "Super admins can read all posts" ON "public"."posts" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user"
  WHERE (("user"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user"."role" = 'super_admin'::"text")))));



CREATE POLICY "Super admins can read group members" ON "public"."user_groups" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user" "requester"
  WHERE (("requester"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("requester"."role" = 'super_admin'::"text")))));



CREATE POLICY "Super admins can read groups" ON "public"."groups" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user" "requester"
  WHERE (("requester"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("requester"."role" = 'super_admin'::"text")))));



CREATE POLICY "Super admins can remove group members" ON "public"."user_groups" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user" "requester"
  WHERE (("requester"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("requester"."role" = 'super_admin'::"text")))));



CREATE POLICY "Super admins can update groups" ON "public"."groups" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user" "requester"
  WHERE (("requester"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("requester"."role" = 'super_admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user" "requester"
  WHERE (("requester"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("requester"."role" = 'super_admin'::"text")))));



CREATE POLICY "Super admins can update home featured posts" ON "public"."home_featured_posts" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user"
  WHERE (("user"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user"."role" = 'super_admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user"
  WHERE (("user"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user"."role" = 'super_admin'::"text")))));



CREATE POLICY "Super admins can update posts" ON "public"."posts" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user"
  WHERE (("user"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user"."role" = 'super_admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user"
  WHERE (("user"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user"."role" = 'super_admin'::"text")))));



CREATE POLICY "User are searchable" ON "public"."user" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Users can create their own user" ON "public"."user" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "Users can update their own user" ON "public"."user" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "Users can view their own divisions" ON "public"."user_divisions" FOR SELECT TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."divisions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."groups" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."home_featured_posts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."posts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sport_game_cost_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sport_game_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sport_game_payments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sport_games" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_divisions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_groups" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";





























































































































































































































































































GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_badminton_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_badminton_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_badminton_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_posts_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_posts_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_posts_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";
























GRANT ALL ON TABLE "public"."divisions" TO "anon";
GRANT ALL ON TABLE "public"."divisions" TO "authenticated";
GRANT ALL ON TABLE "public"."divisions" TO "service_role";



GRANT ALL ON TABLE "public"."groups" TO "anon";
GRANT ALL ON TABLE "public"."groups" TO "authenticated";
GRANT ALL ON TABLE "public"."groups" TO "service_role";



GRANT ALL ON TABLE "public"."home_featured_posts" TO "anon";
GRANT ALL ON TABLE "public"."home_featured_posts" TO "authenticated";
GRANT ALL ON TABLE "public"."home_featured_posts" TO "service_role";



GRANT ALL ON TABLE "public"."posts" TO "anon";
GRANT ALL ON TABLE "public"."posts" TO "authenticated";
GRANT ALL ON TABLE "public"."posts" TO "service_role";



GRANT ALL ON TABLE "public"."sport_game_cost_items" TO "service_role";



GRANT ALL ON TABLE "public"."sport_game_members" TO "service_role";



GRANT ALL ON TABLE "public"."sport_game_payments" TO "service_role";



GRANT ALL ON TABLE "public"."sport_games" TO "service_role";



GRANT ALL ON TABLE "public"."user" TO "anon";
GRANT ALL ON TABLE "public"."user" TO "authenticated";
GRANT ALL ON TABLE "public"."user" TO "service_role";



GRANT ALL ON TABLE "public"."user_divisions" TO "anon";
GRANT ALL ON TABLE "public"."user_divisions" TO "authenticated";
GRANT ALL ON TABLE "public"."user_divisions" TO "service_role";



GRANT ALL ON TABLE "public"."user_groups" TO "anon";
GRANT ALL ON TABLE "public"."user_groups" TO "authenticated";
GRANT ALL ON TABLE "public"."user_groups" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";



































drop extension if exists "pg_net";

drop policy "Divisions are readable" on "public"."divisions";

drop policy "Anyone can read home featured posts" on "public"."home_featured_posts";

drop policy "Published posts are readable" on "public"."posts";

drop policy "User are searchable" on "public"."user";

revoke delete on table "public"."sport_game_cost_items" from "anon";

revoke insert on table "public"."sport_game_cost_items" from "anon";

revoke references on table "public"."sport_game_cost_items" from "anon";

revoke select on table "public"."sport_game_cost_items" from "anon";

revoke trigger on table "public"."sport_game_cost_items" from "anon";

revoke truncate on table "public"."sport_game_cost_items" from "anon";

revoke update on table "public"."sport_game_cost_items" from "anon";

revoke delete on table "public"."sport_game_cost_items" from "authenticated";

revoke insert on table "public"."sport_game_cost_items" from "authenticated";

revoke references on table "public"."sport_game_cost_items" from "authenticated";

revoke select on table "public"."sport_game_cost_items" from "authenticated";

revoke trigger on table "public"."sport_game_cost_items" from "authenticated";

revoke truncate on table "public"."sport_game_cost_items" from "authenticated";

revoke update on table "public"."sport_game_cost_items" from "authenticated";

revoke delete on table "public"."sport_game_members" from "anon";

revoke insert on table "public"."sport_game_members" from "anon";

revoke references on table "public"."sport_game_members" from "anon";

revoke select on table "public"."sport_game_members" from "anon";

revoke trigger on table "public"."sport_game_members" from "anon";

revoke truncate on table "public"."sport_game_members" from "anon";

revoke update on table "public"."sport_game_members" from "anon";

revoke delete on table "public"."sport_game_members" from "authenticated";

revoke insert on table "public"."sport_game_members" from "authenticated";

revoke references on table "public"."sport_game_members" from "authenticated";

revoke select on table "public"."sport_game_members" from "authenticated";

revoke trigger on table "public"."sport_game_members" from "authenticated";

revoke truncate on table "public"."sport_game_members" from "authenticated";

revoke update on table "public"."sport_game_members" from "authenticated";

revoke delete on table "public"."sport_game_payments" from "anon";

revoke insert on table "public"."sport_game_payments" from "anon";

revoke references on table "public"."sport_game_payments" from "anon";

revoke select on table "public"."sport_game_payments" from "anon";

revoke trigger on table "public"."sport_game_payments" from "anon";

revoke truncate on table "public"."sport_game_payments" from "anon";

revoke update on table "public"."sport_game_payments" from "anon";

revoke delete on table "public"."sport_game_payments" from "authenticated";

revoke insert on table "public"."sport_game_payments" from "authenticated";

revoke references on table "public"."sport_game_payments" from "authenticated";

revoke select on table "public"."sport_game_payments" from "authenticated";

revoke trigger on table "public"."sport_game_payments" from "authenticated";

revoke truncate on table "public"."sport_game_payments" from "authenticated";

revoke update on table "public"."sport_game_payments" from "authenticated";

revoke delete on table "public"."sport_games" from "anon";

revoke insert on table "public"."sport_games" from "anon";

revoke references on table "public"."sport_games" from "anon";

revoke select on table "public"."sport_games" from "anon";

revoke trigger on table "public"."sport_games" from "anon";

revoke truncate on table "public"."sport_games" from "anon";

revoke update on table "public"."sport_games" from "anon";

revoke delete on table "public"."sport_games" from "authenticated";

revoke insert on table "public"."sport_games" from "authenticated";

revoke references on table "public"."sport_games" from "authenticated";

revoke select on table "public"."sport_games" from "authenticated";

revoke trigger on table "public"."sport_games" from "authenticated";

revoke truncate on table "public"."sport_games" from "authenticated";

revoke update on table "public"."sport_games" from "authenticated";


  create policy "Divisions are readable"
  on "public"."divisions"
  as permissive
  for select
  to anon, authenticated
using (true);



  create policy "Anyone can read home featured posts"
  on "public"."home_featured_posts"
  as permissive
  for select
  to anon, authenticated
using (true);



  create policy "Published posts are readable"
  on "public"."posts"
  as permissive
  for select
  to anon, authenticated
using ((status = 'published'::text));



  create policy "User are searchable"
  on "public"."user"
  as permissive
  for select
  to anon, authenticated
using (true);



