-- Creates both databases on first PostgreSQL start.
-- The default DB (control_plane) is created by POSTGRES_DB env var;
-- this script adds the suhani tenant database.

CREATE DATABASE suhani;
