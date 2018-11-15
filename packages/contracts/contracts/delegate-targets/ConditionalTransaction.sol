pragma solidity 0.4.25;
pragma experimental "ABIEncoderV2";

import "../lib/Transfer.sol";
import "../lib/Conditional.sol";
import "../Registry.sol";
import "../NonceRegistry.sol";
import "../AppInstance.sol";


/// @title ConditionalTransaction - A conditional transfer contract
/// @author Liam Horne - <liam@l4v.io>
/// @author Mitchell Van Der Hoeff - <mitchell@l4v.io>
/// @notice Supports a complex transfer of funds contingent on some condition.
contract ConditionalTransaction is Conditional {

  using Transfer for Transfer.Transaction;

  function executeSimpleConditionalTransaction(
    Condition condition,
    Transfer.Transaction memory txn
  )
    public
  {
    require(
      isSatisfied(condition),
      "Condition was not satisfied for conditional transaction"
    );
    txn.execute();
  }

}
