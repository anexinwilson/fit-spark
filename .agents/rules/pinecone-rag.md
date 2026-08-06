# Pinecone Serverless Metadata Limitations & RAG Fallbacks

1. **Pinecone Inference API `$in` filter limitations**: The serverless Pinecone inference endpoints (`https://api.pinecone.io/.../search`) do not correctly process the MongoDB-style `$in` filter in metadata (or they are highly case-sensitive and unreliable for array fields like equipment). 
   - **Fix**: Do a broader semantic query *without* the `$in` filter and handle the exact equipment matching in the application code (post-retrieval filtering) by iterating over the returned results and matching the fields manually.

2. **Empty Equipment Fallback Bug**: When users deselect all equipment or only check non-bodyweight options, avoid accidentally injecting "Bodyweight" exercises due to empty array truthiness checks.
   - **Fix**: Ensure `equipment ? equipment.split(",") : []` is used instead of defaulting to `["bodyweight"]`.
   - **Fix**: Prompt instructions for the LLM MUST explicitly forbid hallucinating exercises or defaulting to bodyweight if the user didn't request it. Always respect the user's explicit equipment constraints.
