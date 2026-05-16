import random
import string

def generate_16_char_id():
    """Generates a 16-character alphanumeric ID."""
    chars = string.ascii_uppercase + string.digits
    return ''.join(random.choices(chars, k=16))
