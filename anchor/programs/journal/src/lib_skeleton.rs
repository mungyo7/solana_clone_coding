use anchor_lang::prelude::*;

// This is your program's public key and it will update
// automatically when you build the project.
declare_id!("");
#[program]
mod journal {
    use super::*;

    pub fn create_journal_entry() -> Result<()> {
        msg!("Journal Entry Created");
        msg!("Title: {}", title);
        msg!("Message: {}", message);

        Ok(())
    }

    pub fn update_journal_entry() -> Result<()> {
        msg!("Journal Entry Updated");
        msg!("Title: {}", title);
        msg!("Message: {}", message);

        Ok(())
    }

    pub fn delete_journal_entry() -> Result<()> {
        msg!("Journal entry titled {} deleted", title);
        Ok(())
    }
}

#[account]
pub struct JournalEntryState {}

#[derive(Accounts)]
pub struct CreateEntry<'info> {}

#[derive(Accounts)]
pub struct UpdateEntry<'info> {}

#[derive(Accounts)]
pub struct DeleteEntry<'info> {}
