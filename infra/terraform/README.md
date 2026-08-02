# Fit Spark GCP infrastructure

This Terraform stack prepares only the services used by the current app:

- Cloud Run with scale-to-zero and a single-instance ceiling
- Artifact Registry with automatic image cleanup
- five Secret Manager secrets used by the runtime
- dedicated runtime and GitHub deployer service accounts
- keyless GitHub Actions authentication through Workload Identity Federation

Terraform creates secret containers but never receives secret values, so API
keys and database credentials cannot leak into Git or Terraform state.

## Apply the foundation

Authenticate locally with Application Default Credentials, then copy the
example variables file:

```powershell
gcloud auth application-default login
Copy-Item terraform.tfvars.example terraform.tfvars
terraform init
terraform plan
terraform apply
```

Keep `deploy_cloud_run = false` for this first apply.

## Add secret values

Populate each secret after the foundation exists. PowerShell examples:

```powershell
$value = Read-Host "Gemini API key" -AsSecureString
$plain = [System.Net.NetworkCredential]::new('', $value).Password
$plain | gcloud secrets versions add gemini-api-key --data-file=-
Remove-Variable plain, value
```

Repeat for `clerk-secret-key`, `stripe-secret-key`,
`stripe-webhook-secret`, and `database-url`. Never put those values in a
`.tfvars` file.

## First image and Cloud Run service

Use the `artifact_image_base_url` Terraform output to build and push the first
image. Set `container_image` to that immutable SHA tag, set
`deploy_cloud_run = true`, fill the public variables, and apply again.

After the service exists, GitHub Actions updates only its container image on
each push. Terraform remains the owner of IAM, scaling, environment variables,
and secrets.
