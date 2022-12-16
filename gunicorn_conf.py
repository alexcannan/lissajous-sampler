# https://github.com/tiangolo/uvicorn-gunicorn-docker/blob/master/docker-images/gunicorn_conf.py
import json
import os

accesslog_var = os.getenv("ACCESS_LOG", "-")
use_accesslog = accesslog_var or None
errorlog_var = os.getenv("ERROR_LOG", "-")
use_errorlog = errorlog_var or None
graceful_timeout_str = os.getenv("GRACEFUL_TIMEOUT", "120")
timeout_str = os.getenv("TIMEOUT", "120")
keepalive_str = os.getenv("KEEP_ALIVE", "5")

# Gunicorn config variables
loglevel = os.getenv("LOG_LEVEL", "info")
workers = 1
bind = os.getenv("BIND", "0.0.0.0:5678")
errorlog = use_errorlog
worker_tmp_dir = "/dev/shm"
accesslog = use_accesslog
graceful_timeout = int(graceful_timeout_str)
timeout = int(timeout_str)
keepalive = int(keepalive_str)
forwarded_allow_ips = '*'

# For debugging and testing
log_data = {
    "loglevel": loglevel,
    "workers": workers,
    "bind": bind,
    "graceful_timeout": graceful_timeout,
    "timeout": timeout,
    "keepalive": keepalive,
    "errorlog": errorlog,
    "accesslog": accesslog,
    "forwarded_allow_ips": forwarded_allow_ips,
}
print(json.dumps(log_data))
