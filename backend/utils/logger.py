import logging
import sys
from typing import Optional

def setup_logger(
    name: str,
    level: int = logging.INFO,
    format_string: Optional[str] = None
) -> logging.Logger:
    """Set up a logger with consistent formatting."""
    
    if format_string is None:
        format_string = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    
    logger = logging.getLogger(name)
    logger.setLevel(level)
    
    # console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(level)
    
    # formatter
    formatter = logging.Formatter(format_string)
    console_handler.setFormatter(formatter)
    
    # add handler
    logger.addHandler(console_handler)
    
    return logger

# create default logger
logger = setup_logger(__name__)