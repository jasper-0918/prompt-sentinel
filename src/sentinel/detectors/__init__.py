"""Detector implementations.

Every detector satisfies the `Detector` protocol in `base.py`, which is the
extension point for future ML and LLM-judge layers.
"""

from sentinel.detectors.base import Detector
from sentinel.detectors.delimiter_injection import DelimiterInjection
from sentinel.detectors.encoding_obfuscation import EncodingObfuscation
from sentinel.detectors.instruction_override import InstructionOverride
from sentinel.detectors.roleplay_jailbreak import RoleplayJailbreak
from sentinel.detectors.system_prompt_exfil import SystemPromptExfil

__all__ = [
    "Detector",
    "InstructionOverride",
    "RoleplayJailbreak",
    "DelimiterInjection",
    "EncodingObfuscation",
    "SystemPromptExfil",
]
