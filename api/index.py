import os
import sys

# Add the backend directory to sys.path so that the app and its modules can be found
# We use '..' because this file is in 'api/' and backend is a sibling of 'api/'
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app import app

# Vercel expects the 'app' object to be exposed
# This file effectively acts as the entry point for the Vercel builder
