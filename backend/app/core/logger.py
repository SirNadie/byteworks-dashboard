"""
Structured logging configuration for ByteWorks Dashboard.
Provides consistent, level-based logging with JSON formatting for production.
"""

import logging
import sys
from typing import Optional


class ColoredFormatter(logging.Formatter):
    """Custom formatter with colors for console output."""
    
    COLORS = {
        'DEBUG': '\033[36m',     # Cyan
        'INFO': '\033[32m',      # Green
        'WARNING': '\033[33m',   # Yellow
        'ERROR': '\033[31m',     # Red
        'CRITICAL': '\033[35m',  # Magenta
    }
    RESET = '\033[0m'
    ICONS = {
        'DEBUG': '🔍',
        'INFO': '✅',
        'WARNING': '⚠️',
        'ERROR': '❌',
        'CRITICAL': '🔥',
    }

    def format(self, record: logging.LogRecord) -> str:
        color = self.COLORS.get(record.levelname, self.RESET)
        icon = self.ICONS.get(record.levelname, '')
        
        # Format: [LEVEL] module - message
        log_format = f"{color}{icon} [{record.levelname}]{self.RESET} {record.name} - {record.getMessage()}"
        
        # Add exception info if present
        if record.exc_info:
            log_format += f"\n{self.formatException(record.exc_info)}"
        
        return log_format


def get_logger(name: str, level: Optional[str] = None) -> logging.Logger:
    """
    Get a configured logger instance.
    
    Args:
        name: Logger name (typically __name__ of the module)
        level: Optional log level override (DEBUG, INFO, WARNING, ERROR, CRITICAL)
    
    Returns:
        Configured logger instance
    """
    logger = logging.getLogger(name)
    
    # Only configure if not already configured
    if not logger.handlers:
        # Default level is INFO, can be overridden
        log_level = getattr(logging, (level or 'INFO').upper())
        logger.setLevel(log_level)
        
        # Console handler with colors
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(log_level)
        console_handler.setFormatter(ColoredFormatter())
        
        logger.addHandler(console_handler)
        
        # Prevent propagation to root logger
        logger.propagate = False
    
    return logger


# Pre-configured loggers for common modules
def get_app_logger() -> logging.Logger:
    """Get the main application logger."""
    return get_logger('byteworks')


def get_api_logger() -> logging.Logger:
    """Get the API routes logger."""
    return get_logger('byteworks.api')


def get_service_logger() -> logging.Logger:
    """Get the services logger."""
    return get_logger('byteworks.services')


def get_db_logger() -> logging.Logger:
    """Get the database logger."""
    return get_logger('byteworks.db')


# Convenience function for quick logging
logger = get_app_logger()
