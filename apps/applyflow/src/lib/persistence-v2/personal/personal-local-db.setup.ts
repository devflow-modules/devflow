const LOCAL_DATABASE_URL = "postgresql://applyflow:applyflow_local_dev@127.0.0.1:5434/applyflow";

process.env.DATABASE_URL = LOCAL_DATABASE_URL;
process.env.DIRECT_URL = LOCAL_DATABASE_URL;
process.env.APPLYFLOW_DB_TARGET = "local";
